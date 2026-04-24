package com.colabconnect.repository.json;

import com.colabconnect.model.User;
import com.colabconnect.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class JsonUserRepository extends JsonBaseRepository implements UserRepository {
    private final Map<String, User> users;
    private static final File FILE = new File("data/users.json");

    public JsonUserRepository() {
        super();
        this.users = loadMap(FILE, new TypeReference<ConcurrentHashMap<String, User>>() {});
    }

    private void save() {
        saveMap(FILE, users);
    }

    @Override
    public User getUserById(String id) {
        return users.get(id);
    }

    @Override
    public User getUserByEmail(String email) {
        return users.values().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst()
                .orElse(null);
    }

    @Override
    public User saveUser(User user) {
        if (user.getId() == null || user.getId().isEmpty()) {
            user.setId(java.util.UUID.randomUUID().toString());
        }
        users.put(user.getId(), user);
        save();
        return user;
    }

    @Override
    public List<User> searchUsers(String query, String skills) {
        return users.values().stream()
                .filter(u -> {
                    boolean matQ = query == null || query.isBlank() || 
                            u.getName().toLowerCase().contains(query.toLowerCase()) || 
                            (u.getTitle() != null && u.getTitle().toLowerCase().contains(query.toLowerCase()));
                    boolean matS = skills == null || skills.isBlank() || 
                            (u.getSkills() != null && u.getSkills().stream().anyMatch(s -> s.equalsIgnoreCase(skills)));
                    return matQ && matS;
                })
                .collect(Collectors.toList());
    }

    @Override
    public Map<String, User> getUsers() {
        return users;
    }
}
