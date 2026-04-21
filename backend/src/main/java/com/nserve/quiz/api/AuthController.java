package com.nserve.quiz.api;

import com.nserve.quiz.dto.AuthIdentifierRequest;
import com.nserve.quiz.dto.AuthSignupRequest;
import com.nserve.quiz.dto.ForgotPinVerifyRequest;
import com.nserve.quiz.dto.ForgotPinVerifyResponse;
import com.nserve.quiz.dto.GoogleAuthRequest;
import com.nserve.quiz.dto.LoginRequest;
import com.nserve.quiz.dto.OtpVerifyResponse;
import com.nserve.quiz.dto.ResetPinRequest;
import com.nserve.quiz.dto.SecurityQuestionRequest;
import com.nserve.quiz.dto.SendOtpRequest;
import com.nserve.quiz.dto.SetPinRequest;
import com.nserve.quiz.dto.VerifyPinRequest;
import com.nserve.quiz.dto.VerifyOtpRequest;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.security.CurrentUser;
import com.nserve.quiz.service.AuthService;
import com.nserve.quiz.service.TwilioOtpService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

  private final AuthService authService;
  private final TwilioOtpService twilioOtpService;

  public AuthController(AuthService authService, TwilioOtpService twilioOtpService) {
    this.authService = authService;
    this.twilioOtpService = twilioOtpService;
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
              req.pin(),
              req.securityQuestion(),
              req.securityAnswer(),
              req.faceEncoding(),
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

  @PostMapping("/send-otp")
  public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest req) {
    try {
      twilioOtpService.sendOtp(req.phone());
      return ResponseEntity.ok(Map.of("sent", true));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    } catch (IllegalStateException e) {
      String msg = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
      if (msg.contains("trial account")) {
        return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
      }
      return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", "Twilio error: " + e.getMessage()));
    } catch (Throwable t) {
      return ResponseEntity.status(500).body(Map.of("error", "Twilio error: " + t));
    }
  }

  @PostMapping("/verify-otp")
  public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
    try {
      boolean ok = twilioOtpService.verifyOtp(req.phone(), req.code());
      if (!ok) {
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP"));
      }
      AuthService.OtpLoginResult r = authService.loginPhoneAfterOtp(req.phone());
      return ResponseEntity.ok(new OtpVerifyResponse(r.auth().token(), r.auth().user(), r.newUser()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    } catch (IllegalStateException e) {
      String msg = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
      if (msg.contains("trial account")) {
        return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
      }
      return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", "Twilio error: " + e.getMessage()));
    } catch (Throwable t) {
      return ResponseEntity.status(500).body(Map.of("error", "Twilio error: " + t));
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

  @PostMapping("/set-pin")
  public ResponseEntity<?> setPin(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody SetPinRequest req) {
    try {
      return ResponseEntity.ok(authService.setPin(user, req.pin()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/verify-pin")
  public ResponseEntity<?> verifyPin(@Valid @RequestBody VerifyPinRequest req) {
    try {
      return ResponseEntity.ok(authService.loginWithPhonePin(req.phone(), req.pin()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/security-question")
  public ResponseEntity<?> setSecurityQuestion(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody SecurityQuestionRequest req) {
    try {
      return ResponseEntity.ok(authService.setSecurityQuestion(user, req.question(), req.answer()));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/forgot-pin/send-otp")
  public ResponseEntity<?> forgotPinSendOtp(@Valid @RequestBody SendOtpRequest req) {
    return sendOtp(req);
  }

  @PostMapping("/forgot-pin/verify")
  public ResponseEntity<?> forgotPinVerify(@Valid @RequestBody ForgotPinVerifyRequest req) {
    try {
      boolean ok = twilioOtpService.verifyOtp(req.phone(), req.code());
      if (!ok) {
        return ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP"));
      }
      String token =
          authService.verifyForgotPinSecurity(req.phone(), req.question(), req.answer());
      return ResponseEntity.ok(new ForgotPinVerifyResponse(true, token));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    } catch (IllegalStateException e) {
      return ResponseEntity.status(503).body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/reset-pin")
  public ResponseEntity<?> resetPin(@Valid @RequestBody ResetPinRequest req) {
    try {
      authService.resetPin(req.recoveryToken(), req.pin());
      return ResponseEntity.ok(Map.of("reset", true));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }
}
