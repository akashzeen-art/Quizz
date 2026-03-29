package com.nserve.quiz.security;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.repo.UserRepository;
import com.nserve.quiz.service.JwtService;
import com.nserve.quiz.service.UserActivityService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthFilter extends OncePerRequestFilter {

  private final UserRepository userRepository;
  private final JwtService jwtService;
  private final UserActivityService userActivityService;

  public AuthFilter(
      UserRepository userRepository,
      JwtService jwtService,
      UserActivityService userActivityService) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.userActivityService = userActivityService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String uri = request.getRequestURI();
    if (uri.startsWith("/auth")
        || uri.equals("/health")
        || uri.startsWith("/error")
        || uri.startsWith("/files")
        || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
      return true;
    }
    return "POST".equalsIgnoreCase(request.getMethod()) && uri.equals("/admin/login");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String uri = request.getRequestURI();
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
      writeUnauthorized(response);
      return;
    }
    String token = header.substring(7).trim();

    if (uri.startsWith("/admin")) {
      if (!jwtService.validateAdminToken(token)) {
        writeUnauthorized(response);
        return;
      }
      request.setAttribute(CurrentAdmin.ATTR, jwtService.getSubject(token));
      filterChain.doFilter(request, response);
      return;
    }

    Optional<User> user = userRepository.findByAuthToken(token);
    if (user.isEmpty()) {
      writeUnauthorized(response);
      return;
    }
    userActivityService.touchLastActive(user.get().getId());
    request.setAttribute(CurrentUser.ATTR, user.get());
    filterChain.doFilter(request, response);
  }

  private static void writeUnauthorized(HttpServletResponse response) throws IOException {
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.getWriter().write("{\"error\":\"Unauthorized\"}");
  }
}
