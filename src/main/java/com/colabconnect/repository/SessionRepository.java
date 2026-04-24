package com.colabconnect.repository;

public interface SessionRepository {
    String createSession(String userId);
    String getUserIdFromSession(String token);
    void removeSession(String token);
}
