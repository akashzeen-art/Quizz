package com.nserve.quiz.api;

import com.nserve.quiz.dto.AuthIdentifierRequest;
import com.nserve.quiz.dto.AuthSignupRequest;
import com.nserve.quiz.dto.GoogleAuthRequest;
import com.nserve.quiz.dto.LoginRequest;
import com.nserve.quiz.service.AuthService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
    try {
      String method = req.method() != null ? req.method().trim().toLowerCase() : "";
      if ("phone".equals(method)) {
        return ResponseEntity.ok(authService.loginPhone(req.identifier()));
      }
      if ("email".equals(method)) {
        return ResponseEntity.ok(authService.loginEmail(req.identifier()));
      }
      return ResponseEntity.badRequest().body(Map.of("error", "method must be phone or email"));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/signup")
  public ResponseEntity<?> signup(@Valid @RequestBody AuthSignupRequest req) {
    try {
      return ResponseEntity.ok(
          authService.signup(
              req.method(),
              req.identifier(),
              req.gameTag(),
              req.name(),
              req.avatarKey(),
              req.googleCredential()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    } catch (IllegalStateException e) {
      return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
    } catch (GeneralSecurityException | IOException e) {
      return ResponseEntity.badRequest().body(Map.of("error", "Could not verify Google sign-in"));
    }
  }

  @PostMapping("/login/email")
  public ResponseEntity<?> loginEmail(@Valid @RequestBody AuthIdentifierRequest req) {
    try {
      return ResponseEntity.ok(authService.loginEmailExisting(req.identifier()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/login/phone")
  public ResponseEntity<?> loginPhone(@Valid @RequestBody AuthIdentifierRequest req) {
    try {
      return ResponseEntity.ok(authService.loginPhoneExisting(req.identifier()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/google")
  public ResponseEntity<?> google(@Valid @RequestBody GoogleAuthRequest req) {
    try {
      return ResponseEntity.ok(authService.loginWithGoogle(req.credential()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    } catch (IllegalStateException e) {
      return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
    } catch (GeneralSecurityException | IOException e) {
      return ResponseEntity.badRequest()
          .body(Map.of("error", "Could not verify Google sign-in"));
    }
  }
}
