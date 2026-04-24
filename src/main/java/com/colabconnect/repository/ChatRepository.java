package com.colabconnect.repository;

import com.colabconnect.model.ChatMessage;
import com.colabconnect.model.DirectMessage;
import java.util.List;

public interface ChatRepository {
    List<ChatMessage> getChatMessages(String projectId);
    ChatMessage addChatMessage(ChatMessage msg);
    boolean hasGuestMessageSent(String projectId, String userId);
    void markGuestMessageSent(String projectId, String userId);
    
    String dmKey(String uid1, String uid2);
    List<DirectMessage> getDirectMessages(String uid1, String uid2);
    DirectMessage addDirectMessage(DirectMessage msg);
    boolean hasDmGuestSent(String fromId, String toId);
    void markDmGuestSent(String fromId, String toId);
    List<String> getDmPartners(String userId);
}
