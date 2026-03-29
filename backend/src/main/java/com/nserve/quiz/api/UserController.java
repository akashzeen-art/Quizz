package com.nserve.quiz.api;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.LocationUpdateRequest;
import com.nserve.quiz.dto.PreferencesRequest;
import com.nserve.quiz.dto.ProfileUpdateRequest;
import com.nserve.quiz.dto.UserProfileDto;
import com.nserve.quiz.security.CurrentUser;
import com.nserve.quiz.service.UserService;
import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/user")
public class UserController {

  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping("/profile")
  public UserProfileDto profile(@RequestAttribute(CurrentUser.ATTR) User user) {
    return userService.profile(user);
  }

  @PutMapping("/profile")
  public UserProfileDto updateProfile(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody ProfileUpdateRequest body) {
    return userService.updateProfile(user, body);
  }

  @PostMapping("/profile/photo")
  public UserProfileDto uploadProfilePhoto(
      @RequestAttribute(CurrentUser.ATTR) User user, @RequestPart("file") MultipartFile file)
      throws IOException {
    return userService.uploadAndPersistProfilePhoto(user, file);
  }

  @PostMapping("/preferences")
  public UserProfileDto preferences(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody PreferencesRequest body) {
    return userService.savePreferences(user, body);
  }

  /** Compatibility endpoint for older clients; also accepts list-only locations like preferences. */
  @PostMapping("/location")
  public UserProfileDto location(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody LocationUpdateRequest body) {
    return userService.saveLocation(user, body.location());
  }
}
