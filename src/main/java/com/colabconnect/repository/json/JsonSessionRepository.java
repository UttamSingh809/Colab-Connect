package com.colabconnect.repository.json;

import com.colabconnect.repository.SessionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class JsonSessionRepository extends JsonBaseRepository implements SessionRepository {
    private final Map<String, String> sessions;
    private static final File FILE = new File("data/sessions.json");

    public JsonSessionRepository() {
        super();
        this.sessions = loadMap(FILE, new TypeReference<ConcurrentHashMap<String, String>>() {});
    }

    private void save() {
        saveMap(FILE, sessions);
    }

    @Override
    public String createSession(String userId) {
        String token = UUID.randomUUID().toString();
        sessions.put(token, userId);
        save();
        return token;
    }

    @Override
    public String getUserIdFromSession(String token) {
        return sessions.get(token);
    }

    @Override
    public void removeSession(String token) {
        sessions.remove(token);
        save();
    }
}
