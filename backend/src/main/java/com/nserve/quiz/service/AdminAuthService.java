package com.nserve.quiz.service;

import com.nserve.quiz.domain.Admin;
import com.nserve.quiz.dto.AdminLoginRequest;
import com.nserve.quiz.dto.AdminLoginResponse;
import com.nserve.quiz.repo.AdminRepository;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

  private final AdminRepository adminRepository;
  private final JwtService jwtService;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
  private final long jwtExpirationMs;

  public AdminAuthService(
      AdminRepository adminRepository,
      JwtService jwtService,
      @Value("${app.jwt.expiration-ms:86400000}") long jwtExpirationMs) {
    this.adminRepository = adminRepository;
    this.jwtService = jwtService;
    this.jwtExpirationMs = jwtExpirationMs;
  }

  public AdminLoginResponse login(AdminLoginRequest req) {
    String email = req.email().trim().toLowerCase();
    Optional<Admin> admin = adminRepository.findByEmailIgnoreCase(email);
    if (admin.isEmpty()) {
      throw new IllegalArgumentException("Invalid email or password");
    }
    if (!passwordEncoder.matches(req.password(), admin.get().getPasswordHash())) {
      throw new IllegalArgumentException("Invalid email or password");
    }
    String token = jwtService.createAdminToken(email);
    return new AdminLoginResponse(token, "Bearer", jwtExpirationMs / 1000);
  }
}
