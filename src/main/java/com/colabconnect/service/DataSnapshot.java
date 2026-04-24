package com.colabconnect.service;

import com.colabconnect.model.*;
import java.util.*;

public class DataSnapshot {
    public Map<String, User> users = new HashMap<>();
    public Map<String, Project> projects = new HashMap<>();
    public Map<String, ConnectionRequest> connectionRequests = new HashMap<>();
    public Map<String, List<ChatMessage>> chatMessages = new HashMap<>();
    public List<String> guestMessageSent = new ArrayList<>();
    public Map<String, List<DirectMessage>> directMessages = new HashMap<>();
    public List<String> dmGuestSent = new ArrayList<>();
    public Map<String, List<PeerRating>> ratings = new HashMap<>();
    public Map<String, String> sessions = new HashMap<>();
}
