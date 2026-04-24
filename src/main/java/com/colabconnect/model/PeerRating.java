package com.colabconnect.model;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
@NoArgsConstructor
public class PeerRating {
    private String id;
    private String projectId;
    private String fromUserId;
    private String toUserId;
    private int stars;
    private String note;
    private LocalDateTime timestamp;
}
