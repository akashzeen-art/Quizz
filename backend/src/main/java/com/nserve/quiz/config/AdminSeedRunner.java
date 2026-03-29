package com.nserve.quiz.config;

import com.nserve.quiz.domain.Admin;
import com.nserve.quiz.repo.AdminRepository;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminSeedRunner implements ApplicationRunner {

  private final AdminRepository adminRepository;
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  @Value("${app.admin.seed-email}")
  private String seedEmail;

  @Value("${app.admin.seed-password}")
  private String seedPassword;

  public AdminSeedRunner(AdminRepository adminRepository) {
    this.adminRepository = adminRepository;
  }

  @Override
  public void run(ApplicationArguments args) {
    if (adminRepository.findByEmailIgnoreCase(seedEmail.trim().toLowerCase()).isEmpty()) {
      Admin a = new Admin();
      a.setEmail(seedEmail.trim().toLowerCase());
      a.setPasswordHash(encoder.encode(seedPassword));
      a.setCreatedAt(Instant.now());
      adminRepository.save(a);
    }
  }
}
