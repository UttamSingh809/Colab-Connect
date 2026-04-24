package com.colabconnect.repository;

import com.colabconnect.model.Project;
import java.util.List;
import java.util.Map;

public interface ProjectRepository {
    Project getProjectById(String id);
    List<Project> getProjectsByUserId(String userId);
    List<Project> getAllProjects();
    Project saveProject(Project project);
    void addMemberToProject(String projectId, String userId);
    boolean voteComplete(String projectId, String userId);
    void reopenProject(String projectId);
    Map<String, Project> getProjects();
    boolean isProjectMember(String projectId, String userId);
    boolean isConnectedToAnyProjectMember(String projectId, String userId);
}
