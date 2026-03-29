package com.nserve.quiz.api;

import com.nserve.quiz.dto.AdminLoginRequest;
import com.nserve.quiz.dto.AdminLoginResponse;
import com.nserve.quiz.service.AdminAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
public class AdminAuthController {

  private final AdminAuthService adminAuthService;

  public AdminAuthController(AdminAuthService adminAuthService) {
    this.adminAuthService = adminAuthService;
  }

  @PostMapping("/login")
  public AdminLoginResponse login(@Valid @RequestBody AdminLoginRequest body) {
    return adminAuthService.login(body);
  }
}
