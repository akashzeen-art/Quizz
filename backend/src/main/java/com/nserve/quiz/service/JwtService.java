package com.nserve.quiz.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final SecretKey key;
  private final long expirationMs;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
    if (secret == null || secret.length() < 32) {
      throw new IllegalStateException("app.jwt.secret must be at least 32 characters");
    }
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMs = expirationMs;
  }

  public String createAdminToken(String email) {
    long now = System.currentTimeMillis();
    Date exp = new Date(now + expirationMs);
    return Jwts.builder()
        .subject(email.toLowerCase())
        .claim("role", "ADMIN")
        .issuedAt(new Date(now))
        .expiration(exp)
        .signWith(key)
        .compact();
  }

  public boolean validateAdminToken(String token) {
    try {
      Claims c =
          Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
      return "ADMIN".equals(c.get("role", String.class));
    } catch (Exception e) {
      return false;
    }
  }

  public String getSubject(String token) {
    Claims c =
        Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    return c.getSubject();
  }
}
