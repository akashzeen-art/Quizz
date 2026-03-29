package com.nserve.quiz.service;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AuthResponse;
import com.nserve.quiz.dto.OtpSentResponse;
import com.nserve.quiz.dto.UserProfileDto;
import com.nserve.quiz.repo.UserRepository;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private static final String DEMO_OTP = "123456";

  private final UserRepository userRepository;
  private final UserMapper userMapper;

  private final ConcurrentHashMap<String, String> phoneOtps = new ConcurrentHashMap<>();

  public AuthService(UserRepository userRepository, UserMapper userMapper) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
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

  public AuthResponse loginGoogle() {
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    User user = new User();
    user.setEmail("google." + suffix + "@demo.skillquiz");
    user.setDisplayName("Google Player");
    user.setAuthToken(newToken());
    user.setCreatedAt(Instant.now());
    user.setPlanType("FREE");
    user.setPlanStatus("ACTIVE");
    user = userRepository.save(user);
    return authResponse(user);
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
