package com.nserve.quiz.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AuthResponse;
import com.nserve.quiz.dto.OtpSentResponse;
import com.nserve.quiz.dto.UserProfileDto;
import com.nserve.quiz.repo.UserRepository;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private static final String DEMO_OTP = "123456";

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final String googleClientId;

  private final ConcurrentHashMap<String, String> phoneOtps = new ConcurrentHashMap<>();

  public AuthService(
      UserRepository userRepository,
      UserMapper userMapper,
      @Value("${app.google.client-id:}") String googleClientId) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.googleClientId = googleClientId != null ? googleClientId.trim() : "";
  }

  public OtpSentResponse loginPhone(String rawPhone) {
    String phone = normalizePhone(rawPhone);
    phoneOtps.put(phone, DEMO_OTP);
    return new OtpSentResponse(true, "OTP sent (demo: use " + DEMO_OTP + ")");
  }

  public AuthResponse verifyOtp(String rawPhone, String otp) {
    String phone = normalizePhone(rawPhone);
    String expected = phoneOtps.getOrDefault(phone, DEMO_OTP);
    if (!expected.equals(otp.trim())) {
      throw new IllegalArgumentException("Invalid OTP");
    }
    User user =
        userRepository
            .findByPhone(phone)
            .orElseGet(
                () -> {
                  User u = new User();
                  u.setPhone(phone);
                  u.setDisplayName(
                      "Player " + phone.substring(Math.max(0, phone.length() - 4)));
                  u.setAuthToken(newToken());
                  u.setCreatedAt(Instant.now());
                  u.setPlanType("FREE");
                  u.setPlanStatus("ACTIVE");
                  return userRepository.save(u);
                });
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  public AuthResponse loginEmail(String rawEmail) {
    String email = rawEmail.trim().toLowerCase();
    User user =
        userRepository
            .findByEmail(email)
            .orElseGet(
                () -> {
                  String local =
                      email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
                  User u = new User();
                  u.setEmail(email);
                  u.setDisplayName(capitalize(local));
                  u.setAuthToken(newToken());
                  u.setCreatedAt(Instant.now());
                  u.setPlanType("FREE");
                  u.setPlanStatus("ACTIVE");
                  return userRepository.save(u);
                });
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  /**
   * Verifies the Google ID token (GIS credential JWT) and signs the user in or registers them.
   */
  public AuthResponse loginWithGoogle(String credentialJwt)
      throws GeneralSecurityException, IOException {
    if (credentialJwt == null || credentialJwt.isBlank()) {
      throw new IllegalArgumentException("Missing Google credential");
    }
    if (googleClientId.isEmpty()) {
      throw new IllegalStateException("Google sign-in is not configured (set GOOGLE_CLIENT_ID)");
    }

    GoogleIdToken idToken = verifyGoogleIdToken(credentialJwt);
    GoogleIdToken.Payload payload = idToken.getPayload();
    String sub = payload.getSubject();
    String email = (String) payload.get("email");
    Boolean emailVerified = (Boolean) payload.get("email_verified");
    String name = (String) payload.get("name");
    String picture = (String) payload.get("picture");

    if (email == null || email.isBlank()) {
      throw new IllegalArgumentException("Google account has no email");
    }
    if (Boolean.FALSE.equals(emailVerified)) {
      throw new IllegalArgumentException("Google email is not verified");
    }
    email = email.trim().toLowerCase();

    Optional<User> bySub = userRepository.findByGoogleSub(sub);
    if (bySub.isPresent()) {
      return ensureSession(bySub.get());
    }

    Optional<User> byEmail = userRepository.findByEmail(email);
    if (byEmail.isPresent()) {
      User u = byEmail.get();
      u.setGoogleSub(sub);
      if (u.getDisplayName() == null || u.getDisplayName().isBlank()) {
        u.setDisplayName(displayNameFromEmailOrName(email, name));
      }
      if ((u.getProfilePhotoUrl() == null || u.getProfilePhotoUrl().isBlank())
          && picture != null
          && !picture.isBlank()) {
        u.setProfilePhotoUrl(picture);
      }
      if (u.getAuthToken() == null || u.getAuthToken().isBlank()) {
        u.setAuthToken(newToken());
      }
      return authResponse(userRepository.save(u));
    }

    User user = new User();
    user.setGoogleSub(sub);
    user.setEmail(email);
    user.setDisplayName(displayNameFromEmailOrName(email, name));
    if (picture != null && !picture.isBlank()) {
      user.setProfilePhotoUrl(picture);
    }
    user.setAuthToken(newToken());
    user.setCreatedAt(Instant.now());
    user.setPlanType("FREE");
    user.setPlanStatus("ACTIVE");
    return authResponse(userRepository.save(user));
  }

  private GoogleIdToken verifyGoogleIdToken(String credentialJwt)
      throws GeneralSecurityException, IOException {
    GoogleIdTokenVerifier verifier =
        new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(Collections.singletonList(googleClientId))
            .build();
    GoogleIdToken token = verifier.verify(credentialJwt);
    if (token == null) {
      throw new IllegalArgumentException("Invalid Google credential");
    }
    return token;
  }

  private AuthResponse ensureSession(User user) {
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  private static String displayNameFromEmailOrName(String email, String name) {
    if (name != null && !name.isBlank()) {
      return name.trim();
    }
    int at = email.indexOf('@');
    return capitalize(at > 0 ? email.substring(0, at) : email);
  }

  private AuthResponse authResponse(User user) {
    UserProfileDto dto = userMapper.toDto(user);
    return new AuthResponse(user.getAuthToken(), dto);
  }

  private static String newToken() {
    return UUID.randomUUID().toString().replace("-", "")
        + UUID.randomUUID().toString().replace("-", "");
  }

  private static String normalizePhone(String raw) {
    return raw.replaceAll("\\D", "");
  }

  private static String capitalize(String s) {
    if (s == null || s.isEmpty()) {
      return "Player";
    }
    return Character.toUpperCase(s.charAt(0)) + s.substring(1);
  }
}
