package com.colabconnect.controller;

import com.colabconnect.model.PeerRating;
import com.colabconnect.model.Project;
import com.colabconnect.repository.ProjectRepository; import com.colabconnect.repository.UserRepository; import com.colabconnect.repository.SessionRepository; import com.colabconnect.repository.RatingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/cc/projects")
public class ProjectController {

    private final ProjectRepository projectRepository; private final UserRepository userRepository; private final SessionRepository sessionRepository; private final RatingRepository ratingRepository;

    public ProjectController(ProjectRepository projectRepository, UserRepository userRepository, SessionRepository sessionRepository, RatingRepository ratingRepository) {
        this.projectRepository = projectRepository; this.userRepository = userRepository; this.sessionRepository = sessionRepository; this.ratingRepository = ratingRepository;
    }

    private String resolveUserId(String token) {
        if (token == null || token.isEmpty()) return null;
        return sessionRepository.getUserIdFromSession(token);
    }

    @GetMapping
    public ResponseEntity<?> getProjects(
            @RequestParam(defaultValue = "mine") String scope,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        List<Project> list;
        if ("all".equals(scope)) {
            list = projectRepository.getAllProjects();
        } else {
            list = projectRepository.getProjectsByUserId(userId);
        }
        return ResponseEntity.ok(list.stream().map(p -> enrichProject(p, userId)).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<?> createProject(
            @RequestBody Map<String, Object> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        String name = (String) body.getOrDefault("name", "");
        if (name.trim().isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "Project name is required"));

        Project project = new Project();
        project.setName(name.trim());
        project.setDescription((String) body.getOrDefault("description", ""));
        project.setType((String) body.getOrDefault("type", "Project"));
        project.setStatus((String) body.getOrDefault("status", "open"));
        project.setOwnerId(userId);
        project.getMemberIds().add(userId);
        if (body.containsKey("requiredSkills")) {
            @SuppressWarnings("unchecked")
            List<String> skills = (List<String>) body.get("requiredSkills");
            project.setRequiredSkills(skills);
        }
        projectRepository.saveProject(project);
        return ResponseEntity.ok(enrichProject(project, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(
            @PathVariable String id,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Project project = projectRepository.getProjectById(id);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));
        return ResponseEntity.ok(enrichProject(project, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProject(
            @PathVariable String id,
            @RequestBody Map<String, Object> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Project project = projectRepository.getProjectById(id);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));
        if (!project.getOwnerId().equals(userId)) return ResponseEntity.status(403).body(Map.of("message", "Only the project owner can edit this project"));

        if (body.containsKey("name")) project.setName((String) body.get("name"));
        if (body.containsKey("description")) project.setDescription((String) body.get("description"));
        if (body.containsKey("type")) project.setType((String) body.get("type"));
        if (body.containsKey("status")) project.setStatus((String) body.get("status"));
        if (body.containsKey("requiredSkills")) {
            @SuppressWarnings("unchecked")
            List<String> skills = (List<String>) body.get("requiredSkills");
            project.setRequiredSkills(skills);
        }
        projectRepository.saveProject(project);
        return ResponseEntity.ok(enrichProject(project, userId));
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<?> addMember(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Project project = projectRepository.getProjectById(id);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));
        if (!project.getOwnerId().equals(userId)) return ResponseEntity.status(403).body(Map.of("message", "Only the project owner can add members"));

        String newMemberId = body.getOrDefault("userId", "");
        if (newMemberId.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "userId is required"));
        var newMember = userRepository.getUserById(newMemberId);
        if (newMember == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        if (project.getMemberIds().contains(newMemberId))
            return ResponseEntity.badRequest().body(Map.of("message", newMember.getName() + " is already a member"));

        projectRepository.addMemberToProject(id, newMemberId);
        return ResponseEntity.ok(Map.of("success", true, "message", newMember.getName() + " added to " + project.getName()));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<?> voteComplete(
            @PathVariable String id,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Project project = projectRepository.getProjectById(id);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));
        if (!project.getMemberIds().contains(userId))
            return ResponseEntity.status(403).body(Map.of("message", "Only project members can vote to complete"));
        if ("completed".equals(project.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("message", "Project is already completed"));

        boolean nowComplete = projectRepository.voteComplete(id, userId);
        project = projectRepository.getProjectById(id);
        int votes = project.getCompletionVotes().size();
        int total = project.getMemberIds().size();
        String msg = nowComplete
                ? "Project marked as complete! You can now rate your teammates."
                : "Vote recorded (" + votes + "/" + total + " members have voted)";
        return ResponseEntity.ok(Map.of("success", true, "message", msg, "completed", nowComplete,
                "votes", votes, "totalMembers", total, "project", enrichProject(project, userId)));
    }

    @PostMapping("/{id}/reopen")
    public ResponseEntity<?> reopenProject(
            @PathVariable String id,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Project project = projectRepository.getProjectById(id);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));
        if (!project.getOwnerId().equals(userId))
            return ResponseEntity.status(403).body(Map.of("message", "Only the project owner can reopen a project"));

        projectRepository.reopenProject(id);
        project = projectRepository.getProjectById(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Project reopened", "project", enrichProject(project, userId)));
    }

    @PostMapping("/{id}/rate/{targetUserId}")
    public ResponseEntity<?> rateTeammate(
            @PathVariable String id,
            @PathVariable String targetUserId,
            @RequestBody Map<String, Object> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        if (userId.equals(targetUserId)) return ResponseEntity.badRequest().body(Map.of("message", "You cannot rate yourself"));

        Project project = projectRepository.getProjectById(id);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));
        if (!"completed".equals(project.getStatus()))
            return ResponseEntity.badRequest().body(Map.of("message", "Ratings are only available after project completion"));
        if (!project.getMemberIds().contains(userId))
            return ResponseEntity.status(403).body(Map.of("message", "Only project members can submit ratings"));
        if (!project.getMemberIds().contains(targetUserId))
            return ResponseEntity.badRequest().body(Map.of("message", "Target user is not a member of this project"));
        if (ratingRepository.hasRated(id, userId, targetUserId))
            return ResponseEntity.badRequest().body(Map.of("message", "You have already rated this teammate"));

        int stars = body.containsKey("stars") ? ((Number) body.get("stars")).intValue() : 0;
        if (stars < 1 || stars > 5) return ResponseEntity.badRequest().body(Map.of("message", "Rating must be 1–5 stars"));
        String note = (String) body.getOrDefault("note", "");

        PeerRating rating = new PeerRating();
        rating.setProjectId(id);
        rating.setFromUserId(userId);
        rating.setToUserId(targetUserId);
        rating.setStars(stars);
        rating.setNote(note.trim());
        ratingRepository.addRating(rating);

        var target = userRepository.getUserById(targetUserId);
        return ResponseEntity.ok(Map.of("success", true, "message",
                "Rating submitted for " + (target != null ? target.getName() : targetUserId)));
    }

    @GetMapping("/{id}/ratings")
    public ResponseEntity<?> getProjectRatings(
            @PathVariable String id,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Project project = projectRepository.getProjectById(id);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));

        List<Map<String, Object>> result = ratingRepository.getRatingsForProject(id).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("fromUserId", r.getFromUserId());
            var from = userRepository.getUserById(r.getFromUserId());
            m.put("fromUserName", from != null ? from.getName() : "Unknown");
            m.put("toUserId", r.getToUserId());
            var to = userRepository.getUserById(r.getToUserId());
            m.put("toUserName", to != null ? to.getName() : "Unknown");
            m.put("stars", r.getStars());
            m.put("note", r.getNote());
            m.put("timestamp", r.getTimestamp() != null ? r.getTimestamp().toString() : null);
            m.put("hasRatedBack", ratingRepository.hasRated(id, r.getToUserId(), r.getFromUserId()));
            return m;
        }).collect(Collectors.toList());

        boolean isMember = project.getMemberIds().contains(userId);
        List<Map<String, Object>> rateableTeammates = new ArrayList<>();
        if (isMember && "completed".equals(project.getStatus())) {
            rateableTeammates = project.getMemberIds().stream()
                    .filter(mid -> !mid.equals(userId))
                    .filter(mid -> !ratingRepository.hasRated(id, userId, mid))
                    .map(mid -> {
                        var u = userRepository.getUserById(mid);
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("id", mid);
                        m.put("name", u != null ? u.getName() : "Unknown");
                        return m;
                    }).collect(Collectors.toList());
        }

        return ResponseEntity.ok(Map.of("ratings", result, "rateableTeammates", rateableTeammates,
                "isMember", isMember, "isCompleted", "completed".equals(project.getStatus())));
    }

    private Map<String, Object> enrichProject(Project p, String currentUserId) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("name", p.getName());
        map.put("description", p.getDescription());
        map.put("ownerId", p.getOwnerId());
        map.put("type", p.getType());
        map.put("status", p.getStatus());
        map.put("requiredSkills", p.getRequiredSkills());
        map.put("createdAt", p.getCreatedAt() != null ? p.getCreatedAt().toString() : null);
        map.put("completedAt", p.getCompletedAt() != null ? p.getCompletedAt().toString() : null);
        map.put("isOwner", p.getOwnerId().equals(currentUserId));
        map.put("isMember", p.getMemberIds().contains(currentUserId));
        map.put("memberCount", p.getMemberIds().size());
        map.put("completionVotes", p.getCompletionVotes().size());
        map.put("hasVotedComplete", p.getCompletionVotes().contains(currentUserId));
        map.put("canRateTeammates", "completed".equals(p.getStatus()) && p.getMemberIds().contains(currentUserId));

        List<Map<String, Object>> members = p.getMemberIds().stream().map(mid -> {
            var u = userRepository.getUserById(mid);
            if (u == null) return null;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getName());
            m.put("title", u.getTitle());
            m.put("isOwner", mid.equals(p.getOwnerId()));
            return m;
        }).filter(Objects::nonNull).collect(Collectors.toList());
        map.put("members", members);

        var owner = userRepository.getUserById(p.getOwnerId());
        if (owner != null) map.put("ownerName", owner.getName());

        return map;
    }
}
