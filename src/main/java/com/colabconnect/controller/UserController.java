package com.colabconnect.controller;

import com.colabconnect.model.PeerRating;
import com.colabconnect.model.User;
import com.colabconnect.repository.ProjectRepository;
import com.colabconnect.repository.RatingRepository;
import com.colabconnect.repository.SessionRepository;
import com.colabconnect.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/cc/users")
public class UserController {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final RatingRepository ratingRepository;
    private final ProjectRepository projectRepository;

    public UserController(UserRepository userRepository, SessionRepository sessionRepository, RatingRepository ratingRepository, ProjectRepository projectRepository) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.ratingRepository = ratingRepository;
        this.projectRepository = projectRepository;
    }

    private String resolveUserId(String token) {
        if (token == null || token.isEmpty()) return null;
        return sessionRepository.getUserIdFromSession(token);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@CookieValue(value = "cc_token", required = false) String token) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User user = userRepository.getUserById(userId);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        return ResponseEntity.ok(safeUser(user, true));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@CookieValue(value = "cc_token", required = false) String token,
                                       @RequestBody Map<String, Object> body) {
        String userId = resolveUserId(token);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User user = userRepository.getUserById(userId);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        if (body.containsKey("name")) user.setName((String) body.get("name"));
        if (body.containsKey("title")) user.setTitle((String) body.get("title"));
        if (body.containsKey("bio")) user.setBio((String) body.get("bio"));
        if (body.containsKey("githubUrl")) user.setGithubUrl((String) body.get("githubUrl"));
        if (body.containsKey("portfolioUrl")) user.setPortfolioUrl((String) body.get("portfolioUrl"));
        if (body.containsKey("availability")) user.setAvailability((String) body.get("availability"));
        if (body.containsKey("workStyle")) user.setWorkStyle((String) body.get("workStyle"));
        if (body.containsKey("skills")) {
            @SuppressWarnings("unchecked")
            List<String> skills = (List<String>) body.get("skills");
            user.setSkills(skills);
        }
        if (body.containsKey("projectTypes")) {
            @SuppressWarnings("unchecked")
            List<String> pt = (List<String>) body.get("projectTypes");
            user.setProjectTypes(pt);
        }

        userRepository.saveUser(user);
        return ResponseEntity.ok(safeUser(user, true));
    }

    @GetMapping
    public ResponseEntity<?> searchUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String skills,
            @CookieValue(value = "cc_token", required = false) String token) {
        List<User> results = userRepository.searchUsers(query, skills);
        String currentUserId = resolveUserId(token);
        List<Map<String, Object>> safe = new ArrayList<>();
        for (User u : results) {
            if (currentUserId != null && u.getId().equals(currentUserId)) continue;
            safe.add(safeUser(u, false));
        }
        return ResponseEntity.ok(safe);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id,
                                          @CookieValue(value = "cc_token", required = false) String token) {
        User user = userRepository.getUserById(id);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        String currentUserId = resolveUserId(token);
        boolean isSelf = id.equals(currentUserId);
        return ResponseEntity.ok(safeUser(user, isSelf));
    }

    private Map<String, Object> safeUser(User user, boolean includeSensitive) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("name", user.getName());
        map.put("title", user.getTitle());
        map.put("bio", user.getBio());
        map.put("avatarUrl", user.getAvatarUrl());
        map.put("skills", user.getSkills());
        map.put("githubUrl", user.getGithubUrl());
        map.put("portfolioUrl", user.getPortfolioUrl());
        map.put("availability", user.getAvailability());
        map.put("workStyle", user.getWorkStyle());
        map.put("projectTypes", user.getProjectTypes());
        map.put("reliabilityScore", user.getReliabilityScore());
        map.put("collaborations", user.getCollaborations());
        map.put("joinedAt", user.getJoinedAt() != null ? user.getJoinedAt().toString() : null);
        if (includeSensitive) {
            map.put("email", user.getEmail());
        }

        List<PeerRating> userRatings = ratingRepository.getRatingsForUser(user.getId());
        double avgRating = ratingRepository.getAverageRating(user.getId());
        map.put("avgRating", Math.round(avgRating * 10.0) / 10.0);
        map.put("ratingCount", userRatings.size());
        List<Map<String, Object>> endorsements = new ArrayList<>();
        for (PeerRating r : userRatings.stream().limit(5).collect(java.util.stream.Collectors.toList())) {
            if (r.getNote() != null && !r.getNote().isEmpty()) {
                Map<String, Object> e = new LinkedHashMap<>();
                var rater = userRepository.getUserById(r.getFromUserId());
                var project = projectRepository.getProjectById(r.getProjectId());
                e.put("fromName", rater != null ? rater.getName() : "Someone");
                e.put("fromTitle", rater != null ? rater.getTitle() : "");
                e.put("projectName", project != null ? project.getName() : "a project");
                e.put("stars", r.getStars());
                e.put("note", r.getNote());
                e.put("timestamp", r.getTimestamp() != null ? r.getTimestamp().toString() : null);
                endorsements.add(e);
            }
        }
        map.put("endorsements", endorsements);
        return map;
    }
}
