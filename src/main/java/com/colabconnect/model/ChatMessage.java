package com.colabconnect.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
@Setter
@Getter
public class ChatMessage {
    private String id;
    private String projectId;
    private String senderId;
    private String senderName;
    private String content;
    private LocalDateTime timestamp;
}
