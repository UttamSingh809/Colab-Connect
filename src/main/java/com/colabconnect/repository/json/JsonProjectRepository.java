package com.colabconnect.repository.json;

import com.colabconnect.model.Project;
import com.colabconnect.repository.ProjectRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.stereotype.Repository;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class JsonProjectRepository extends JsonBaseRepository implements ProjectRepository {
    private final Map<String, Project> projects;
    private static final File FILE = new File("data/projects.json");

    public JsonProjectRepository() {
        super();
        this.projects = loadMap(FILE, new TypeReference<ConcurrentHashMap<String, Project>>() {});
    }

    private void save() {
        saveMap(FILE, projects);
    }

    @Override
    public Project getProjectById(String id) {
        return projects.get(id);
    }

    @Override
    public List<Project> getProjectsByUserId(String userId) {
        return projects.values().stream()
                .filter(p -> p.getOwnerId().equals(userId) || p.getMemberIds().contains(userId))
                .collect(Collectors.toList());
    }

    @Override
    public List<Project> getAllProjects() {
        return new ArrayList<>(projects.values());
    }

    @Override
    public Project saveProject(Project project) {
        if (project.getId() == null || project.getId().isEmpty()) {
            project.setId(java.util.UUID.randomUUID().toString());
        }
        projects.put(project.getId(), project);
        save();
        return project;
    }

    @Override
    public void addMemberToProject(String projectId, String userId) {
        Project p = projects.get(projectId);
        if (p != null && !p.getMemberIds().contains(userId)) {
            p.getMemberIds().add(userId);
            save();
        }
    }

    @Override
    public boolean voteComplete(String projectId, String userId) {
        Project p = projects.get(projectId);
        if (p != null) {
            p.getCompletionVotes().add(userId);
            save();
            return true;
        }
        return false;
    }

    @Override
    public void reopenProject(String projectId) {
        Project p = projects.get(projectId);
        if (p != null) {
            p.setStatus("active");
            p.getCompletionVotes().clear();
            save();
        }
    }

    @Override
    public Map<String, Project> getProjects() {
        return projects;
    }
    
    @Override
    public boolean isProjectMember(String projectId, String userId) {
        Project p = projects.get(projectId);
        if (p == null) return false;
        return p.getOwnerId().equals(userId) || p.getMemberIds().contains(userId);
    }

    @Override
    public boolean isConnectedToAnyProjectMember(String projectId, String userId) {
        Project p = projects.get(projectId);
        if (p == null) return false;
        if (p.getOwnerId().equals(userId) || p.getMemberIds().contains(userId)) return true;
        
        // This method depends on ConnectionRepository in the old monolith, 
        // but it's fundamentally about direct checking. We'll simplify or offload this
        // check to the connection repository or service layer.
        return false; 
    }
}
