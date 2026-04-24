package com.colabconnect.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
@Setter
@Getter
public class DirectMessage {
    private String id;
    private String fromUserId;
    private String toUserId;
    private String content;
    private LocalDateTime timestamp;
}
