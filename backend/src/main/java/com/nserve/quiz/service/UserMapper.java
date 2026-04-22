package com.nserve.quiz.service;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.UserProfileDto;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public UserProfileDto toDto(User u) {
    String name = u.getDisplayName() != null ? u.getDisplayName() : "Player";
    String plan = u.getPlanType() != null ? u.getPlanType() : "FREE";
    String status = u.getPlanStatus() != null ? u.getPlanStatus() : "ACTIVE";
    return new UserProfileDto(
        u.getId(),
        name,
        u.getGameTag(),
        u.getPinHash() != null && !u.getPinHash().isBlank(),
        u.getSecurityQuestion() != null && !u.getSecurityQuestion().isBlank(),
        u.getSecurityQuestion(),
        u.getFaceEncoding() != null && !u.getFaceEncoding().isEmpty(),
        u.isFaceLoginEnabled(),
        u.getEmail(),
        u.getPhone(),
        u.getTotalScore(),
        u.getWeeklyScore(),
        u.getMonthlyScore(),
        u.getPoints(),
        u.getDayScore(),
        u.getCredits(),
        u.getTotalSpent(),
        u.getWalletPaise(),
        Math.round(u.getWalletPaise() / 100.0 * 100.0) / 100.0,
        u.getTotalSpentPaise(),
        u.getCategories(),
        u.getPlayedDates(),
        u.getLocation(),
        u.getProfilePhotoUrl(),
        u.getAvatarKey(),
        plan,
        status,
        u.getProfileUpdatedAt());
  }
}
