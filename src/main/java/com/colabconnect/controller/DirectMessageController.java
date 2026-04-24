package com.colabconnect.controller;

import com.colabconnect.model.DirectMessage;
import com.colabconnect.model.User;
import com.colabconnect.repository.ChatRepository; import com.colabconnect.repository.ConnectionRepository; import com.colabconnect.repository.SessionRepository; import com.colabconnect.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/cc/dm")
public class DirectMessageController {

    private final ChatRepository chatRepository;    
    private final ConnectionRepository connectionRepository;
    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public DirectMessageController(ChatRepository chatRepository, ConnectionRepository connectionRepository, SessionRepository sessionRepository, UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.chatRepository = chatRepository;
        this.connectionRepository = connectionRepository;
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    private String resolveUserId(String token) {
        if (token == null || token.isEmpty()) return null;
        return sessionRepository.getUserIdFromSession(token);
    }

    @GetMapping
    public ResponseEntity<?> getConversations(
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<String> connectedIds = connectionRepository.getConnectedUserIds(userId);
        List<String> dmPartners = chatRepository.getDmPartners(userId);

        Set<String> allPartners = new LinkedHashSet<>(connectedIds);
        allPartners.addAll(dmPartners);

        List<Map<String, Object>> result = allPartners.stream()
                .filter(id -> !id.equals(userId))
                .map(partnerId -> {
                    User u = userRepository.getUserById(partnerId);
                    if (u == null) return null;
                    List<com.colabconnect.model.DirectMessage> msgs = chatRepository.getDirectMessages(userId, partnerId);
                    com.colabconnect.model.DirectMessage last = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1);

                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("userId", partnerId);
                    m.put("name", u.getName());
                    m.put("title", u.getTitle());
                    m.put("connected", connectionRepository.areConnected(userId, partnerId));
                    m.put("lastMessage", last != null ? last.getContent() : null);
                    m.put("lastMessageTime", last != null ? last.getTimestamp().toString() : null);
                    m.put("lastMessageIsOwn", last != null && last.getFromUserId().equals(userId));
                    return m;
                })
                .filter(Objects::nonNull)
                .sorted((a, b) -> {
                    String ta = (String) a.get("lastMessageTime");
                    String tb = (String) b.get("lastMessageTime");
                    if (ta == null && tb == null) return 0;
                    if (ta == null) return 1;
                    if (tb == null) return -1;
                    return tb.compareTo(ta);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{partnerId}")
    public ResponseEntity<?> getConversation(
            @PathVariable String partnerId,
            @CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        User partner = userRepository.getUserById(partnerId);
        if (partner == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        boolean connected = connectionRepository.areConnected(userId, partnerId);
        
        if (!connected) {
            return ResponseEntity.status(403).body(Map.of("message", "You must be connected with this user to view direct messages."));
        }

        List<Map<String, Object>> messages = chatRepository.getDirectMessages(userId, partnerId).stream()
                .map(msg -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", msg.getId());
                    m.put("fromUserId", msg.getFromUserId());
                    m.put("senderName", msg.getFromUserId().equals(userId) ? "You" :
                            userRepository.getUserById(msg.getFromUserId()) != null ?
                            userRepository.getUserById(msg.getFromUserId()).getName() : "Unknown");
                    m.put("content", msg.getContent());
                    m.put("timestamp", msg.getTimestamp().toString());
                    m.put("isOwn", msg.getFromUserId().equals(userId));
                    return m;
                })
                .collect(Collectors.toList());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("partnerId", partnerId);
        result.put("partnerName", partner.getName());
        result.put("partnerTitle", partner.getTitle());
        result.put("messages", messages);
        result.put("connected", true);
        result.put("canSendUnlimited", true);
        result.put("guestMessageUsed", false);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{partnerId}")
    public ResponseEntity<?> sendMessage(
            @PathVariable String partnerId,
            @RequestBody Map<String, String> body,
            @CookieValue(value = "cc_token", required = false) String token) {
        Map<String, Object> response = new HashMap<>();
        String userId = resolveUserId(token);
        if (userId == null) { response.put("success", false); response.put("message", "Unauthorized"); return ResponseEntity.status(401).body(response); }
        if (userId.equals(partnerId)) { response.put("success", false); response.put("message", "Cannot message yourself"); return ResponseEntity.badRequest().body(response); }

        User partner = userRepository.getUserById(partnerId);
        if (partner == null) { response.put("success", false); response.put("message", "User not found"); return ResponseEntity.status(404).body(response); }

        String content = body.getOrDefault("content", "").trim();
        if (content.isEmpty()) { response.put("success", false); response.put("message", "Message cannot be empty"); return ResponseEntity.badRequest().body(response); }
        if (content.length() > 2000) { response.put("success", false); response.put("message", "Message too long"); return ResponseEntity.badRequest().body(response); }

        boolean connected = connectionRepository.areConnected(userId, partnerId);

        if (!connected) {
            response.put("success", false);
            response.put("message", "You must be connected with this user to send direct messages.");
            return ResponseEntity.status(403).body(response);
        }

        DirectMessage msg = new DirectMessage();
        msg.setFromUserId(userId);
        msg.setToUserId(partnerId);
        msg.setContent(content);
        chatRepository.addDirectMessage(msg);



        Map<String, Object> msgMap = new LinkedHashMap<>();
        msgMap.put("id", msg.getId());
        msgMap.put("fromUserId", userId);
        msgMap.put("senderName", "You");
        msgMap.put("content", msg.getContent());
        msgMap.put("timestamp", msg.getTimestamp().toString());
        msgMap.put("isOwn", true);

        response.put("success", true);
        response.put("message", msgMap);
        response.put("canSendUnlimited", true);
        response.put("guestMessageUsed", false);

        messagingTemplate.convertAndSend("/topic/dm/" + chatRepository.dmKey(userId, partnerId), response);

        return ResponseEntity.ok(response);
    }
}
