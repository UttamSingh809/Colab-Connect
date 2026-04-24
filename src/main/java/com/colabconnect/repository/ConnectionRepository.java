package com.colabconnect.repository;

import com.colabconnect.model.ConnectionRequest;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface ConnectionRepository {
    ConnectionRequest saveConnectionRequest(ConnectionRequest req);
    ConnectionRequest getConnectionRequestById(String id);
    List<ConnectionRequest> getRequestsForUser(String userId);
    List<ConnectionRequest> getRequestsByUser(String userId);
    List<String> getConnectedUserIds(String userId);
    Optional<ConnectionRequest> findExistingRequest(String fromId, String toId, String projectId);
    boolean areConnected(String uid1, String uid2);
    Map<String, ConnectionRequest> getConnectionRequests();
}
