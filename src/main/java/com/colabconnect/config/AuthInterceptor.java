package com.colabconnect.config;

import com.colabconnect.model.User;
import com.colabconnect.repository.SessionRepository;
import com.colabconnect.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import java.util.Arrays;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final SessionRepository sessionRepository;
    private final UserRepository userRepository;

    public AuthInterceptor(SessionRepository sessionRepository, UserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.userRepository = userRepository;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        // Just extract user if available, don't strictly block here, let controllers handle API auth
        User user = getUserFromCookies(request);
        if (user != null) {
            request.setAttribute("currentUser", user);
        }
        return true;
    }

    @Override
    public void postHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler, ModelAndView modelAndView) {
        if (modelAndView != null) {
            User user = (User) request.getAttribute("currentUser");
            if (user != null) {
                modelAndView.addObject("user", user);
                // Also add initials helper
                String initials = "?";
                if (user.getName() != null && !user.getName().isEmpty()) {
                    String[] parts = user.getName().split(" ");
                    initials = parts.length > 1 
                        ? parts[0].substring(0, 1).toUpperCase() + parts[1].substring(0, 1).toUpperCase()
                        : parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
                }
                modelAndView.addObject("userInitials", initials);
            }
        }
    }

    private User getUserFromCookies(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "cc_token".equals(c.getName()))
                .findFirst()
                .map(Cookie::getValue)
                .map(sessionRepository::getUserIdFromSession)
                .map(userRepository::getUserById)
                .orElse(null);
    }
}
