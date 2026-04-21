package com.nserve.quiz.api;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AuthResponse;
import com.nserve.quiz.dto.FaceMatchRequest;
import com.nserve.quiz.dto.FaceMatchResponse;
import com.nserve.quiz.dto.UserProfileDto;
import com.nserve.quiz.repo.UserRepository;
import com.nserve.quiz.security.CurrentUser;
import com.nserve.quiz.service.FaceAuthService;
import com.nserve.quiz.service.FaceRecognitionClient;
import com.nserve.quiz.service.UserMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/face")
public class FaceController {

  private final FaceRecognitionClient faceClient;
  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final FaceAuthService faceAuthService;
  private final MongoTemplate mongoTemplate;

  public FaceController(
      FaceRecognitionClient faceClient,
      UserRepository userRepository,
      UserMapper userMapper,
      FaceAuthService faceAuthService,
      MongoTemplate mongoTemplate) {
    this.faceClient = faceClient;
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.faceAuthService = faceAuthService;
    this.mongoTemplate = mongoTemplate;
  }

  /** Registers or replaces the current user's face embedding. Requires user auth. */
  @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public UserProfileDto register(
      @RequestAttribute(CurrentUser.ATTR) User user, @RequestPart("image") MultipartFile image)
      throws IOException {
    if (image == null || image.isEmpty()) throw new IllegalArgumentException("Image is required");
    var enc = faceClient.encode(image.getBytes());
    if (enc == null || enc.encoding() == null || enc.encoding().isEmpty()) {
      throw new IllegalArgumentException("No face detected. Try again with better lighting.");
    }
    User u = userRepository.findById(user.getId()).orElseThrow();
    u.setFaceEncoding(new ArrayList<>(enc.encoding()));
    u.setFaceLoginEnabled(true);
    userRepository.save(u);
    return userMapper.toDto(u);
  }

  /** Face login: finds a matching user and returns an auth token. No bearer token required. */
  @PostMapping(value = "/login", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public AuthResponse login(@RequestPart("image") MultipartFile image) throws IOException {
    if (image == null || image.isEmpty()) throw new IllegalArgumentException("Image is required");

    Query q =
        new Query()
            .addCriteria(Criteria.where("faceEncoding").ne(null))
            .addCriteria(Criteria.where("faceLoginEnabled").is(true));
    List<User> users = mongoTemplate.find(q, User.class);
    if (users.isEmpty()) {
      throw new IllegalArgumentException("No face profiles registered yet.");
    }

    List<FaceMatchRequest.Candidate> candidates = new ArrayList<>();
    for (User u : users) {
      if (u.getFaceEncoding() == null || u.getFaceEncoding().isEmpty()) continue;
      candidates.add(new FaceMatchRequest.Candidate(u.getId(), u.getFaceEncoding()));
    }
    FaceMatchResponse match =
        faceClient.match(image.getBytes(), new FaceMatchRequest(candidates, 0.6));
    if (match == null || match.userId() == null || match.userId().isBlank()) {
      throw new IllegalArgumentException("Face not recognized. Try again.");
    }
    User user = userRepository.findById(match.userId()).orElseThrow();
    if (!Objects.equals(Boolean.TRUE, user.isFaceLoginEnabled())) {
      throw new IllegalArgumentException("Face login is disabled for this account.");
    }
    return faceAuthService.issueSession(user);
  }
}

