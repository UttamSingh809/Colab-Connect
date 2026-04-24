package com.colabconnect.controller;

import com.colabconnect.model.ConnectionRequest;
import com.colabconnect.model.Project;
import com.colabconnect.model.User;
import com.colabconnect.repository.ConnectionRepository; import com.colabconnect.repository.SessionRepository; import com.colabconnect.repository.ProjectRepository; import com.colabconnect.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/cc/connections")
public class ConnectionController {

    private final ConnectionRepository connectionRepository; private final SessionRepository sessionRepository; private final ProjectRepository projectRepository; private final UserRepository userRepository;

    public ConnectionController(ConnectionRepository connectionRepository, SessionRepository sessionRepository, ProjectRepository projectRepository, UserRepository userRepository) {
        this.connectionRepository = connectionRepository; this.sessionRepository = sessionRepository; this.projectRepository = projectRepository; this.userRepository = userRepository;
    }

    private String resolveUserId(String token) {
        if (token == null || token.isEmpty()) return null;
        return sessionRepository.getUserIdFromSession(token);
    }

    @PostMapping("/request/{targetId}")
    public ResponseEntity<Map<String, Object>> sendRequest(
            @PathVariable String targetId,
            @RequestBody(required = false) Map<String, String> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        Map<String, Object> response = new HashMap<>();
        String userId = resolveUserId(token);
        if (userId == null) { response.put("success", false); response.put("message", "Unauthorized"); return ResponseEntity.status(401).body(response); }
        if (userId.equals(targetId)) { response.put("success", false); response.put("message", "Cannot send request to yourself"); return ResponseEntity.badRequest().body(response); }

        String projectId = body != null ? body.getOrDefault("projectId", null) : null;
        if (projectId == null || projectId.isEmpty()) {
            response.put("success", false);
            response.put("message", "A project must be specified for the join request");
            return ResponseEntity.badRequest().body(response);
        }

        Project project = projectRepository.getProjectById(projectId);
        if (project == null) {
            response.put("success", false);
            response.put("message", "Project not found");
            return ResponseEntity.status(404).body(response);
        }

        if (!project.getOwnerId().equals(userId) && !project.getOwnerId().equals(targetId)) {
            response.put("success", false);
            response.put("message", "Connection requests must involve the project owner");
            return ResponseEntity.status(403).body(response);
        }

        String joiningUserId = project.getOwnerId().equals(userId) ? targetId : userId;
        if (project.getMemberIds().contains(joiningUserId)) {
            response.put("success", false);
            response.put("message", "User is already a member of this project");
            return ResponseEntity.badRequest().body(response);
        }

        Optional<ConnectionRequest> existing = connectionRepository.findExistingRequest(userId, targetId, projectId);
        if (existing.isPresent()) {
            response.put("success", false);
            response.put("message", "You already sent a join request for this project");
            return ResponseEntity.badRequest().body(response);
        }

        ConnectionRequest req = new ConnectionRequest();
        req.setFromUserId(userId);
        req.setToUserId(targetId);
        req.setProjectId(projectId);
        req.setMessage(body != null ? body.getOrDefault("message", "") : "");
        connectionRepository.saveConnectionRequest(req);

        response.put("success", true);
        response.put("message", "Join request sent for project: " + project.getName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/respond/{requestId}")
    public ResponseEntity<Map<String, Object>> respondToRequest(
            @PathVariable String requestId,
            @RequestBody Map<String, String> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        Map<String, Object> response = new HashMap<>();
        String userId = resolveUserId(token);
        if (userId == null) { response.put("success", false); response.put("message", "Unauthorized"); return ResponseEntity.status(401).body(response); }

        ConnectionRequest req = connectionRepository.getConnectionRequestById(requestId);
        if (req == null) { response.put("success", false); response.put("message", "Request not found"); return ResponseEntity.status(404).body(response); }
        if (!req.getToUserId().equals(userId)) { response.put("success", false); response.put("message", "Forbidden"); return ResponseEntity.status(403).body(response); }

        String action = body.getOrDefault("action", "");
        if ("accept".equals(action)) {
            req.setStatus("accepted");
            if (req.getProjectId() != null) {
                Project p = projectRepository.getProjectById(req.getProjectId());
                if (p != null) {
                    if (!p.getMemberIds().contains(req.getFromUserId())) {
                        projectRepository.addMemberToProject(p.getId(), req.getFromUserId());
                    }
                    if (!p.getMemberIds().contains(req.getToUserId())) {
                        projectRepository.addMemberToProject(p.getId(), req.getToUserId());
                    }
                }
            }
        } else if ("reject".equals(action)) {
            req.setStatus("rejected");
        } else {
            response.put("success", false);
            response.put("message", "Invalid action. Use 'accept' or 'reject'");
            return ResponseEntity.badRequest().body(response);
        }
        connectionRepository.saveConnectionRequest(req);
        response.put("success", true);
        response.put("status", req.getStatus());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/requests")
    public ResponseEntity<?> getPendingRequests(@CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Map<String, Object>> result = connectionRepository.getRequestsForUser(userId).stream()
                .filter(r -> "pending".equals(r.getStatus()))
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("fromUserId", r.getFromUserId());
                    m.put("projectId", r.getProjectId());
                    m.put("message", r.getMessage());
                    m.put("createdAt", r.getCreatedAt().toString());
                    User from = userRepository.getUserById(r.getFromUserId());
                    if (from != null) {
                        m.put("fromUserName", from.getName());
                        m.put("fromUserTitle", from.getTitle());
                        m.put("fromUserSkills", from.getSkills());
                    }
                    Project project = r.getProjectId() != null ? projectRepository.getProjectById(r.getProjectId()) : null;
                    if (project != null) {
                        m.put("projectName", project.getName());
                        m.put("projectType", project.getType());
                    }
                    return m;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/sent")
    public ResponseEntity<?> getSentRequests(@CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Map<String, Object>> result = connectionRepository.getRequestsByUser(userId).stream()
                .map(r -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", r.getId());
                    m.put("toUserId", r.getToUserId());
                    m.put("projectId", r.getProjectId());
                    m.put("status", r.getStatus());
                    m.put("message", r.getMessage());
                    m.put("createdAt", r.getCreatedAt().toString());
                    User to = userRepository.getUserById(r.getToUserId());
                    if (to != null) {
                        m.put("toUserName", to.getName());
                        m.put("toUserTitle", to.getTitle());
                    }
                    Project project = r.getProjectId() != null ? projectRepository.getProjectById(r.getProjectId()) : null;
                    if (project != null) {
                        m.put("projectName", project.getName());
                        m.put("projectType", project.getType());
                    }
                    return m;
                }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping
    public ResponseEntity<?> getConnections(@CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Map<String, Object>> result = connectionRepository.getConnectionRequests().values().stream()
                .filter(r -> "accepted".equals(r.getStatus()) &&
                        (r.getFromUserId().equals(userId) || r.getToUserId().equals(userId)))
                .map(r -> {
                    String otherId = r.getFromUserId().equals(userId) ? r.getToUserId() : r.getFromUserId();
                    User u = userRepository.getUserById(otherId);
                    if (u == null) return null;
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("name", u.getName());
                    m.put("title", u.getTitle());
                    m.put("skills", u.getSkills());
                    m.put("availability", u.getAvailability());
                    m.put("projectId", r.getProjectId());
                    Project project = r.getProjectId() != null ? projectRepository.getProjectById(r.getProjectId()) : null;
                    if (project != null) m.put("projectName", project.getName());
                    return m;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/status/{projectId}/{targetId}")
    public ResponseEntity<?> getConnectionStatus(
            @PathVariable String projectId,
            @PathVariable String targetId,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Optional<ConnectionRequest> req = connectionRepository.findExistingRequest(userId, targetId, projectId);
        Map<String, Object> result = new HashMap<>();
        if (req.isEmpty()) {
            result.put("status", "none");
        } else {
            result.put("status", req.get().getStatus());
            result.put("requestId", req.get().getId());
            result.put("isFromMe", req.get().getFromUserId().equals(userId));
        }
        return ResponseEntity.ok(result);
    }
}
