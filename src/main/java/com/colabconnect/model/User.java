package com.colabconnect.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Setter
@Getter
public class User {
    private String id;
    private String name;
    private String email;
    private String password;
    private String title;
    private String bio;
    private String avatarUrl;
    private List<String> skills;
    private String githubUrl;
    private String portfolioUrl;
    private String availability;
    private List<String> projectTypes;
    private String workStyle;
    private int reliabilityScore;
    private int collaborations;
    private LocalDateTime joinedAt;

    public User() {
        this.skills = new ArrayList<>();
        this.projectTypes = new ArrayList<>();
        this.joinedAt = LocalDateTime.now();
        this.reliabilityScore = 0;
        this.collaborations = 0;
        this.availability = "available";
        this.workStyle = "flexible";
        this.avatarUrl = "";
    }
}
