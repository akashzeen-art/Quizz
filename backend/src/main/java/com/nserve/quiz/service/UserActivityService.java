package com.nserve.quiz.service;

import com.nserve.quiz.repo.UserRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class UserActivityService {

  private final UserRepository userRepository;

  public UserActivityService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public void touchLastActive(String userId) {
    userRepository
        .findById(userId)
        .ifPresent(
            u -> {
              u.setLastActiveAt(Instant.now());
              userRepository.save(u);
            });
  }
}
