package com.colabconnect.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Setter
@Getter
public class ConnectionRequest {
    private String id;
    private String fromUserId;
    private String toUserId;
    private String projectId;
    private String status;
    private String message;
    private LocalDateTime createdAt;

    public ConnectionRequest() {
        this.createdAt = LocalDateTime.now();
        this.status = "pending";
    }
}
