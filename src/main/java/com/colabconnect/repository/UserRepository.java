package com.colabconnect.repository;

import com.colabconnect.model.User;
import java.util.List;
import java.util.Map;

public interface UserRepository {
    User getUserById(String id);
    User getUserByEmail(String email);
    User saveUser(User user);
    List<User> searchUsers(String query, String skills);
    Map<String, User> getUsers();
}
