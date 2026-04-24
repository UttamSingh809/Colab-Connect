package com.colabconnect.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebViewController {

    @GetMapping({"/", "/index.html"})
    public String index(HttpServletRequest request) {
        if (request.getAttribute("currentUser") != null) {
            return "redirect:/dashboard";
        }
        return "index";
    }

    @GetMapping({"/dashboard", "/dashboard.html"})
    public String dashboard(Model model, HttpServletRequest request) {
        model.addAttribute("activePage", "dashboard");
        return checkAuth(request, "dashboard");
    }

    @GetMapping({"/discover", "/discover.html"})
    public String discover(Model model, HttpServletRequest request) {
        model.addAttribute("activePage", "discover");
        return checkAuth(request, "discover");
    }

    @GetMapping({"/discover-projects", "/discover-projects.html"})
    public String discoverProjects(Model model, HttpServletRequest request) {
        model.addAttribute("activePage", "discover-projects");
        return checkAuth(request, "discover-projects");
    }

    @GetMapping({"/connections", "/connections.html"})
    public String connections(Model model, HttpServletRequest request) {
        model.addAttribute("activePage", "connections");
        return checkAuth(request, "connections");
    }

    @GetMapping({"/projects", "/projects.html"})
    public String projects(Model model, HttpServletRequest request) {
        model.addAttribute("activePage", "projects");
        return checkAuth(request, "projects");
    }

    @GetMapping({"/chat", "/chat.html"})
    public String chat(Model model, HttpServletRequest request) {
        model.addAttribute("activePage", "chat");
        return checkAuth(request, "chat");
    }

    @GetMapping({"/profile", "/profile.html"})
    public String profile(Model model, HttpServletRequest request) {
        model.addAttribute("activePage", "profile");
        return checkAuth(request, "profile");
    }
    
    private String checkAuth(HttpServletRequest request, String viewName) {
        if (request.getAttribute("currentUser") == null) {
            return "redirect:/";
        }
        return viewName;
    }
}
