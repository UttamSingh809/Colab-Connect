package com.colabconnect.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
public class Project {
    private String id;
    private String name;
    private String description;
    private String ownerId;
    private List<String> memberIds;
    private List<String> requiredSkills;
    private String status;
    private String type;
    private LocalDateTime createdAt;
    private List<String> completionVotes;
    private LocalDateTime completedAt;

    public Project() {
        this.memberIds = new ArrayList<>();
        this.requiredSkills = new ArrayList<>();
        this.completionVotes = new ArrayList<>();
        this.createdAt = LocalDateTime.now();
        this.status = "open";
    }

    public List<String> getCompletionVotes() {
        if (completionVotes == null) completionVotes = new ArrayList<>();
        return completionVotes;
    }
}
