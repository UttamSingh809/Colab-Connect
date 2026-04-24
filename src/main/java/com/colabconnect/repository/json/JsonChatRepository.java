package com.colabconnect.repository.json;

import com.colabconnect.model.ChatMessage;
import com.colabconnect.model.DirectMessage;
import com.colabconnect.repository.ChatRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class JsonChatRepository extends JsonBaseRepository implements ChatRepository {
    private final Map<String, List<ChatMessage>> chatMessages;
    private final Map<String, List<DirectMessage>> directMessages;
    private final Set<String> guestMessageSent;
    private final Set<String> dmGuestSent;

    private static final File CHATS_FILE = new File("data/chats_projects.json");
    private static final File DMS_FILE = new File("data/chats_dms.json");

    public JsonChatRepository() {
        super();
        this.chatMessages = loadMap(CHATS_FILE, new TypeReference<ConcurrentHashMap<String, List<ChatMessage>>>() {});
        this.directMessages = loadMap(DMS_FILE, new TypeReference<ConcurrentHashMap<String, List<DirectMessage>>>() {});
        this.guestMessageSent = ConcurrentHashMap.newKeySet();
        this.dmGuestSent = ConcurrentHashMap.newKeySet();
    }

    private void saveChats() { saveMap(CHATS_FILE, chatMessages); }
    private void saveDms() { saveMap(DMS_FILE, directMessages); }

    @Override
    public List<ChatMessage> getChatMessages(String projectId) {
        return chatMessages.getOrDefault(projectId, new ArrayList<>());
    }

    @Override
    public ChatMessage addChatMessage(ChatMessage msg) {
        if (msg.getId() == null || msg.getId().isEmpty()) {
            msg.setId(java.util.UUID.randomUUID().toString());
        }
        chatMessages.computeIfAbsent(msg.getProjectId(), k -> new ArrayList<>()).add(msg);
        saveChats();
        return msg;
    }

    @Override
    public boolean hasGuestMessageSent(String projectId, String userId) {
        return guestMessageSent.contains(projectId + "_" + userId);
    }

    @Override
    public void markGuestMessageSent(String projectId, String userId) {
        guestMessageSent.add(projectId + "_" + userId);
    }

    @Override
    public String dmKey(String uid1, String uid2) {
        return uid1.compareTo(uid2) < 0 ? uid1 + "_" + uid2 : uid2 + "_" + uid1;
    }

    @Override
    public List<DirectMessage> getDirectMessages(String uid1, String uid2) {
        return directMessages.getOrDefault(dmKey(uid1, uid2), new ArrayList<>());
    }

    @Override
    public DirectMessage addDirectMessage(DirectMessage msg) {
        if (msg.getId() == null || msg.getId().isEmpty()) {
            msg.setId(java.util.UUID.randomUUID().toString());
        }
        directMessages.computeIfAbsent(dmKey(msg.getFromUserId(), msg.getToUserId()), k -> new ArrayList<>()).add(msg);
        saveDms();
        return msg;
    }

    @Override
    public boolean hasDmGuestSent(String fromId, String toId) {
        return dmGuestSent.contains(fromId + "_" + toId);
    }

    @Override
    public void markDmGuestSent(String fromId, String toId) {
        dmGuestSent.add(fromId + "_" + toId);
    }

    @Override
    public List<String> getDmPartners(String userId) {
        List<String> partners = new ArrayList<>();
        for (String key : directMessages.keySet()) {
            if (key.startsWith(userId + "_")) partners.add(key.substring(userId.length() + 1));
            else if (key.endsWith("_" + userId)) partners.add(key.substring(0, key.length() - userId.length() - 1));
        }
        return partners;
    }
}
