package com.nserve.quiz.service;

import com.nserve.quiz.constants.CategoryRules;
import com.nserve.quiz.constants.PresetLocations;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.PreferencesRequest;
import com.nserve.quiz.dto.ProfileUpdateRequest;
import com.nserve.quiz.dto.UserProfileDto;
import com.nserve.quiz.repo.UserRepository;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final FileStorageService fileStorageService;

  public UserService(
      UserRepository userRepository,
      UserMapper userMapper,
      FileStorageService fileStorageService) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.fileStorageService = fileStorageService;
  }

  public UserProfileDto profile(User user) {
    return userMapper.toDto(user);
  }

  public UserProfileDto confirmRules(User user) {
    User u = userRepository.findById(user.getId()).orElse(user);
    u.setRulesConfirmed(true);
    return userMapper.toDto(userRepository.save(u));
  }

  public UserProfileDto savePreferences(User user, PreferencesRequest req) {
    LinkedHashSet<String> cats = new LinkedHashSet<>(req.categories());
    if (cats.size() < CategoryRules.MIN_COUNT || cats.size() > CategoryRules.MAX_COUNT) {
      throw new IllegalArgumentException(
          "Select between "
              + CategoryRules.MIN_COUNT
              + " and "
              + CategoryRules.MAX_COUNT
              + " different categories");
    }
    user.setCategories(new ArrayList<>(cats));
    if (req.location() != null) {
      String t = req.location().trim();
      if (!t.isEmpty() && !PresetLocations.isAllowed(t)) {
        throw new IllegalArgumentException("Location must be from the preset list");
      }
      user.setLocation(t.isEmpty() ? null : t);
    }
    return userMapper.toDto(userRepository.save(user));
  }

  /**
   * Updates only {@link User#getLocation()} — for {@code POST /user/location}. Requires exactly
   * five categories on the user (same as preferences sync).
   */
  public UserProfileDto saveLocation(User user, String rawLocation) {
    LinkedHashSet<String> cats = new LinkedHashSet<>(user.getCategories());
    if (cats.size() < CategoryRules.MIN_COUNT || cats.size() > CategoryRules.MAX_COUNT) {
      throw new IllegalArgumentException(
          "Select between "
              + CategoryRules.MIN_COUNT
              + " and "
              + CategoryRules.MAX_COUNT
              + " different categories");
    }
    String t = rawLocation == null ? "" : rawLocation.trim();
    if (!t.isEmpty() && !PresetLocations.isAllowed(t)) {
      throw new IllegalArgumentException("Location must be from the preset list");
    }
    user.setLocation(t.isEmpty() ? null : t);
    return userMapper.toDto(userRepository.save(user));
  }

  public UserProfileDto updateProfile(User user, ProfileUpdateRequest req) {
    String name = req.displayName().trim();
    if (name.isEmpty()) {
      throw new IllegalArgumentException("Display name is required");
    }
    String tag = normalizeGameTag(req.gameTag());
    if (tag.length() < 4) {
      throw new IllegalArgumentException("Game tag must be at least 4 characters");
    }
    userRepository
        .findByGameTag(tag)
        .filter(other -> !other.getId().equals(user.getId()))
        .ifPresent(other -> {
          throw new IllegalArgumentException("Game tag is already taken");
        });
    user.setDisplayName(name);
    user.setGameTag(tag);

    if (req.clearCustomPhoto()) {
      fileStorageService.deleteIfExists(user.getProfilePhotoUrl());
      user.setProfilePhotoUrl(null);
    }

    if (req.profilePhotoUrl() != null && !req.profilePhotoUrl().isBlank()) {
      String url = req.profilePhotoUrl().trim();
      validateProfilePhotoUrl(user.getId(), url);
      String prev = user.getProfilePhotoUrl();
      if (prev != null && !prev.equals(url)) {
        fileStorageService.deleteIfExists(prev);
      }
      user.setProfilePhotoUrl(url);
    }

    if (req.avatarKey() != null) {
      String a = req.avatarKey().trim();
      user.setAvatarKey(a.isEmpty() ? null : a);
    }

    user.setProfileUpdatedAt(Instant.now());
    return userMapper.toDto(userRepository.save(user));
  }

  /**
   * Saves the image under {@code app.upload.dir}, deletes the previous gallery file if any, and
   * persists {@link User#getProfilePhotoUrl()} to MongoDB immediately.
   */
  public UserProfileDto uploadAndPersistProfilePhoto(User user, MultipartFile file)
      throws IOException {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("File is required");
    }
    String url = fileStorageService.saveProfilePhoto(user.getId(), file);
    String prev = user.getProfilePhotoUrl();
    if (prev != null && !prev.equals(url)) {
      fileStorageService.deleteIfExists(prev);
    }
    user.setProfilePhotoUrl(url);
    user.setProfileUpdatedAt(Instant.now());
    return userMapper.toDto(userRepository.save(user));
  }

  private static void validateProfilePhotoUrl(String userId, String url) {
    String prefix = "/files/profile/" + userId + "/";
    if (!url.startsWith(prefix)) {
      throw new IllegalArgumentException("Invalid profile photo path");
    }
  }

  private static String normalizeGameTag(String raw) {
    if (raw == null) return "";
    String compact = raw.trim().replaceAll("\\s+", "");
    return compact.replaceAll("[^A-Za-z0-9_]", "");
  }
}
