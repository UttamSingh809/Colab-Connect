package com.colabconnect.config;

import com.colabconnect.model.User;
import com.colabconnect.repository.SessionRepository;
import com.colabconnect.repository.UserRepository;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import jakarta.servlet.http.Cookie;
import java.util.Arrays;
import java.util.Map;

public class AuthHandshakeInterceptor implements HandshakeInterceptor {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    public AuthHandshakeInterceptor(SessionRepository sessionRepository, UserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        if (request instanceof ServletServerHttpRequest) {
            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
            Cookie[] cookies = servletRequest.getServletRequest().getCookies();
            if (cookies != null) {
                User user = Arrays.stream(cookies)
                        .filter(c -> "cc_token".equals(c.getName()))
                        .findFirst()
                        .map(Cookie::getValue)
                        .map(sessionRepository::getUserIdFromSession)
                        .map(userRepository::getUserById)
                        .orElse(null);

                if (user != null) {
                    attributes.put("userId", user.getId());
                    attributes.put("userName", user.getName());
                    return true;
                }
            }
        }
        return false; // Reject handshake if no valid cc_token
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Nothing needed here
    }
}
