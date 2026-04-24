package com.colabconnect.repository.json;

import com.colabconnect.model.PeerRating;
import com.colabconnect.repository.RatingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class JsonRatingRepository extends JsonBaseRepository implements RatingRepository {
    private final Map<String, List<PeerRating>> ratings;
    private static final File FILE = new File("data/ratings.json");

    public JsonRatingRepository() {
        super();
        this.ratings = loadMap(FILE, new TypeReference<ConcurrentHashMap<String, List<PeerRating>>>() {});
    }

    private void save() { saveMap(FILE, ratings); }

    @Override
    public PeerRating addRating(PeerRating rating) {
        if (rating.getId() == null || rating.getId().isEmpty()) {
            rating.setId(java.util.UUID.randomUUID().toString());
        }
        ratings.computeIfAbsent(rating.getProjectId(), k -> new ArrayList<>()).add(rating);
        save();
        return rating;
    }

    @Override
    public List<PeerRating> getRatingsForProject(String projectId) {
        return ratings.getOrDefault(projectId, new ArrayList<>());
    }

    @Override
    public List<PeerRating> getRatingsForUser(String userId) {
        return ratings.values().stream()
                .flatMap(List::stream)
                .filter(r -> r.getToUserId().equals(userId))
                .collect(Collectors.toList());
    }

    @Override
    public boolean hasRated(String projectId, String fromUserId, String toUserId) {
        return getRatingsForProject(projectId).stream()
                .anyMatch(r -> r.getFromUserId().equals(fromUserId) && r.getToUserId().equals(toUserId));
    }

    @Override
    public double getAverageRating(String userId) {
        List<PeerRating> userRatings = getRatingsForUser(userId);
        if (userRatings.isEmpty()) return 0.0;
        return userRatings.stream().mapToInt(PeerRating::getStars).average().orElse(0.0);
    }
}
