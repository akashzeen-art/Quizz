package com.nserve.quiz.service;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AuthResponse;
import com.nserve.quiz.dto.UserProfileDto;
import com.nserve.quiz.repo.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class FaceAuthService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final WalletService walletService;

  public FaceAuthService(UserRepository userRepository, UserMapper userMapper, WalletService walletService) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.walletService = walletService;
  }

  public AuthResponse issueSession(User user) {
    User u = userRepository.findById(user.getId()).orElse(user);
    if (u.getAuthToken() == null || u.getAuthToken().isBlank()) {
      u.setAuthToken(newToken());
      u = userRepository.save(u);
    }
    walletService.grantStarterCreditsIfNeeded(u);
    UserProfileDto dto = userMapper.toDto(u);
    return new AuthResponse(u.getAuthToken(), dto);
  }

  private static String newToken() {
    return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
  }
}

