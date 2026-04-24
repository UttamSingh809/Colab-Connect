
package com.colabconnect.controller;

import com.colabconnect.model.ChatMessage;
import com.colabconnect.model.Project;
import com.colabconnect.model.User;
import com.colabconnect.repository.ChatRepository; import com.colabconnect.repository.ProjectRepository; import com.colabconnect.repository.SessionRepository; import com.colabconnect.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/cc/chat")
public class ChatController {

    private final ChatRepository chatRepository; private final ProjectRepository projectRepository;    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatRepository chatRepository, ProjectRepository projectRepository, SessionRepository sessionRepository, UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.chatRepository = chatRepository;
        this.projectRepository = projectRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    private String resolveUserId(String token) {
        if (token == null || token.isEmpty()) return null;
        return sessionRepository.getUserIdFromSession(token);
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getMessages(
            @PathVariable String projectId,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Project project = projectRepository.getProjectById(projectId);
        if (project == null) return ResponseEntity.status(404).body(Map.of("message", "Project not found"));

        List<Map<String, Object>> messages = chatRepository.getChatMessages(projectId).stream()
                .sorted(Comparator.comparing(ChatMessage::getTimestamp))
                .map(msg -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", msg.getId());
                    m.put("senderId", msg.getSenderId());
                    m.put("senderName", msg.getSenderName());
                    m.put("content", msg.getContent());
                    m.put("timestamp", msg.getTimestamp().toString());
                    m.put("isOwn", msg.getSenderId().equals(userId));
                    return m;
                })
                .collect(Collectors.toList());

        boolean isMember = projectRepository.isProjectMember(projectId, userId);

        if (!isMember) {
            return ResponseEntity.status(403).body(Map.of("message", "You must be a member of this project to view messages."));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("messages", messages);
        result.put("projectName", project.getName());
        result.put("canSendUnlimited", true);
        result.put("guestMessageUsed", false);
        result.put("isMember", true);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/{projectId}")
    public ResponseEntity<?> sendMessage(
            @PathVariable String projectId,
            @RequestBody Map<String, String> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        Map<String, Object> response = new HashMap<>();
        String userId = resolveUserId(token);
        if (userId == null) { response.put("success", false); response.put("message", "Unauthorized"); return ResponseEntity.status(401).body(response); }

        Project project = projectRepository.getProjectById(projectId);
        if (project == null) { response.put("success", false); response.put("message", "Project not found"); return ResponseEntity.status(404).body(response); }

        String content = body.getOrDefault("content", "").trim();
        if (content.isEmpty()) { response.put("success", false); response.put("message", "Message cannot be empty"); return ResponseEntity.badRequest().body(response); }
        if (content.length() > 2000) { response.put("success", false); response.put("message", "Message too long (max 2000 chars)"); return ResponseEntity.badRequest().body(response); }

        boolean isMember = projectRepository.isProjectMember(projectId, userId);

        if (!isMember) {
            response.put("success", false);
            response.put("message", "You must be a member of this project to send messages.");
            return ResponseEntity.status(403).body(response);
        }

        User sender = userRepository.getUserById(userId);
        ChatMessage msg = new ChatMessage();
        msg.setProjectId(projectId);
        msg.setSenderId(userId);
        msg.setSenderName(sender != null ? sender.getName() : "Unknown");
        msg.setContent(content);
        chatRepository.addChatMessage(msg);



        Map<String, Object> msgMap = new LinkedHashMap<>();
        msgMap.put("id", msg.getId());
        msgMap.put("senderId", msg.getSenderId());
        msgMap.put("senderName", msg.getSenderName());
        msgMap.put("content", msg.getContent());
        msgMap.put("timestamp", msg.getTimestamp().toString());
        msgMap.put("isOwn", true);

        response.put("success", true);
        response.put("message", msgMap);
        response.put("canSendUnlimited", true);
        response.put("guestMessageUsed", false);
        
        messagingTemplate.convertAndSend("/topic/project/" + projectId, response);
        
        return ResponseEntity.ok(response);
    }
}
