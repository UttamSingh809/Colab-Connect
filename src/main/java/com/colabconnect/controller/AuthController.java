package com.colabconnect.controller;

import com.colabconnect.model.User;
import com.colabconnect.repository.UserRepository;
import com.colabconnect.repository.SessionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/cc/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;

    public AuthController(UserRepository userRepository, SessionRepository sessionRepository) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> body, HttpServletResponse httpServletResponse) {
        Map<String, Object> response = new HashMap<>();
        String email = body.get("email");
        String name = body.get("name");
        String password = body.get("password");

        if (email == null || name == null || password == null) {
            response.put("success", false);
            response.put("message", "Name, email and password are required");
            return ResponseEntity.badRequest().body(response);
        }

        if (userRepository.getUserByEmail(email) != null) {
            response.put("success", false);
            response.put("message", "Email already registered");
            return ResponseEntity.badRequest().body(response);
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(password);
        user.setTitle(body.getOrDefault("title", ""));
        User saved = userRepository.saveUser(user);

        String token = sessionRepository.createSession(saved.getId());
        setCookie(httpServletResponse, token);
        response.put("success", true);
        response.put("sessionToken", token);
        response.put("userId", saved.getId());
        response.put("name", saved.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body, HttpServletResponse httpServletResponse) {
        Map<String, Object> response = new HashMap<>();
        String email = body.get("email");
        String password = body.get("password");

        User user = userRepository.getUserByEmail(email);
        if (user == null || !user.getPassword().equals(password)) {
            response.put("success", false);
            response.put("message", "Invalid email or password");
            return ResponseEntity.status(401).body(response);
        }

        String token = sessionRepository.createSession(user.getId());
        setCookie(httpServletResponse, token);
        response.put("success", true);
        response.put("sessionToken", token);
        response.put("userId", user.getId());
        response.put("name", user.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(@CookieValue(value = "cc_token", required = false) String token, HttpServletResponse httpServletResponse) {
        if (token != null) sessionRepository.removeSession(token);
        Cookie cookie = new Cookie("cc_token", "");
        cookie.setPath("/");
        cookie.setMaxAge(0);
        httpServletResponse.addCookie(cookie);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return ResponseEntity.ok(response);
    }

    private void setCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie("cc_token", token);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(30 * 24 * 60 * 60); // 30 days
        response.addCookie(cookie);
    }
}
