package com.colabconnect.repository.json;

import com.colabconnect.model.ConnectionRequest;
import com.colabconnect.repository.ConnectionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class JsonConnectionRepository extends JsonBaseRepository implements ConnectionRepository {
    private final Map<String, ConnectionRequest> connectionRequests;
    private static final File FILE = new File("data/connections.json");

    public JsonConnectionRepository() {
        super();
        this.connectionRequests = loadMap(FILE, new TypeReference<ConcurrentHashMap<String, ConnectionRequest>>() {});
    }

    private void save() {
        saveMap(FILE, connectionRequests);
    }

    @Override
    public ConnectionRequest saveConnectionRequest(ConnectionRequest req) {
        if (req.getId() == null || req.getId().isEmpty()) {
            req.setId(java.util.UUID.randomUUID().toString());
        }
        connectionRequests.put(req.getId(), req);
        save();
        return req;
    }

    @Override
    public ConnectionRequest getConnectionRequestById(String id) {
        return connectionRequests.get(id);
    }

    @Override
    public List<ConnectionRequest> getRequestsForUser(String userId) {
        return connectionRequests.values().stream()
                .filter(r -> r.getToUserId().equals(userId))
                .collect(Collectors.toList());
    }

    @Override
    public List<ConnectionRequest> getRequestsByUser(String userId) {
        return connectionRequests.values().stream()
                .filter(r -> r.getFromUserId().equals(userId))
                .collect(Collectors.toList());
    }

    @Override
    public List<String> getConnectedUserIds(String userId) {
        return connectionRequests.values().stream()
                .filter(r -> "accepted".equals(r.getStatus()) && (r.getFromUserId().equals(userId) || r.getToUserId().equals(userId)))
                .map(r -> r.getFromUserId().equals(userId) ? r.getToUserId() : r.getFromUserId())
                .distinct()
                .collect(Collectors.toList());
    }

    @Override
    public Optional<ConnectionRequest> findExistingRequest(String fromId, String toId, String projectId) {
        return connectionRequests.values().stream()
                .filter(r -> r.getFromUserId().equals(fromId) && 
                        r.getToUserId().equals(toId) && 
                        (projectId == null || projectId.equals(r.getProjectId())))
                .findFirst();
    }

    @Override
    public boolean areConnected(String uid1, String uid2) {
        return connectionRequests.values().stream()
                .anyMatch(r -> "accepted".equals(r.getStatus()) &&
                        ((r.getFromUserId().equals(uid1) && r.getToUserId().equals(uid2)) ||
                         (r.getFromUserId().equals(uid2) && r.getToUserId().equals(uid1))));
    }

    @Override
    public Map<String, ConnectionRequest> getConnectionRequests() {
        return connectionRequests;
    }
}
