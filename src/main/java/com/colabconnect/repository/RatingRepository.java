package com.colabconnect.repository;

import com.colabconnect.model.PeerRating;
import java.util.List;

public interface RatingRepository {
    PeerRating addRating(PeerRating rating);
    List<PeerRating> getRatingsForProject(String projectId);
    List<PeerRating> getRatingsForUser(String userId);
    boolean hasRated(String projectId, String fromUserId, String toUserId);
    double getAverageRating(String userId);
}
