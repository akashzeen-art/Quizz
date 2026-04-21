package com.nserve.quiz.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AuthResponse;
import com.nserve.quiz.dto.UserProfileDto;
import com.nserve.quiz.repo.UserRepository;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserRepository userRepository;
  private final UserMapper userMapper;
  private final WalletService walletService;
  private final String googleClientId;
  private final Map<String, RecoveryToken> pinRecoveryTokens = new ConcurrentHashMap<>();
  private static final long PIN_RECOVERY_TTL_MS = 5 * 60_000L;
  private static final Set<String> ALLOWED_SECURITY_QUESTIONS =
      Set.of(
          "What is your pet's name?",
          "What is your birth city?",
          "What was your first school name?",
          "What is your mother's maiden name?",
          "What was your childhood nickname?");

  public AuthService(
      UserRepository userRepository,
      UserMapper userMapper,
      WalletService walletService,
      @Value("${app.google.client-id:}") String googleClientId) {
    this.userRepository = userRepository;
    this.userMapper = userMapper;
    this.walletService = walletService;
    this.googleClientId = googleClientId != null ? googleClientId.trim() : "";
  }

  /** Sign in or register by phone (digits only, country code + national number, no OTP). */
  public AuthResponse loginPhone(String rawPhone) {
    String phone = normalizePhone(rawPhone);
    if (phone.length() < 8 || phone.length() > 15) {
      throw new IllegalArgumentException("Enter a valid phone number with country code");
    }
    User user =
        userRepository
            .findByPhone(phone)
            .orElseGet(
                () -> {
                  User u = new User();
                  u.setPhone(phone);
                  u.setDisplayName(
                      "Player " + phone.substring(Math.max(0, phone.length() - 4)));
                  u.setGameTag(generateUniqueGameTag(u.getDisplayName(), phone));
                  u.setAuthToken(newToken());
                  u.setCreatedAt(Instant.now());
                  u.setPlanType("FREE");
                  u.setPlanStatus("ACTIVE");
                  return userRepository.save(u);
                });
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  public record OtpLoginResult(AuthResponse auth, boolean newUser) {}

  /** Sign in or register by phone after OTP verification. */
  public OtpLoginResult loginPhoneAfterOtp(String rawPhone) {
    String phone = normalizePhone(rawPhone);
    if (phone.length() < 8 || phone.length() > 15) {
      throw new IllegalArgumentException("Enter a valid phone number with country code");
    }
    final boolean[] created = new boolean[] {false};
    User user =
        userRepository
            .findByPhone(phone)
            .orElseGet(
                () -> {
                  created[0] = true;
                  User u = new User();
                  u.setPhone(phone);
                  u.setDisplayName("Player " + phone.substring(Math.max(0, phone.length() - 4)));
                  u.setGameTag(generateUniqueGameTag(u.getDisplayName(), phone));
                  u.setAuthToken(newToken());
                  u.setCreatedAt(Instant.now());
                  u.setPlanType("FREE");
                  u.setPlanStatus("ACTIVE");
                  return userRepository.save(u);
                });
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return new OtpLoginResult(authResponse(user), created[0]);
  }

  public AuthResponse loginWithPhonePin(String rawPhone, String pin) {
    String phone = normalizePhone(rawPhone);
    validatePin(pin);
    User user =
        userRepository
            .findByPhone(phone)
            .orElseThrow(() -> new IllegalArgumentException("No account found. Please sign up."));
    if (user.getPinHash() == null || user.getPinHash().isBlank()) {
      throw new IllegalArgumentException("PIN is not set for this account");
    }
    if (!BCrypt.checkpw(pin.trim(), user.getPinHash())) {
      throw new IllegalArgumentException("Wrong PIN");
    }
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  public UserProfileDto setPin(User current, String pin) {
    validatePin(pin);
    User user = userRepository.findById(current.getId()).orElse(current);
    user.setPinHash(BCrypt.hashpw(pin.trim(), BCrypt.gensalt()));
    return userMapper.toDto(userRepository.save(user));
  }

  public UserProfileDto setSecurityQuestion(User current, String question, String answer) {
    String q = normalizeSecurityQuestion(question);
    String normalizedAnswer = normalizeSecurityAnswer(answer);
    User user = userRepository.findById(current.getId()).orElse(current);
    user.setSecurityQuestion(q);
    user.setSecurityAnswerHash(BCrypt.hashpw(normalizedAnswer, BCrypt.gensalt()));
    return userMapper.toDto(userRepository.save(user));
  }

  public String verifyForgotPinSecurity(String rawPhone, String question, String answer) {
    String phone = normalizePhone(rawPhone);
    User user =
        userRepository
            .findByPhone(phone)
            .orElseThrow(() -> new IllegalArgumentException("No account found for this phone"));
    String q = normalizeSecurityQuestion(question);
    if (user.getSecurityQuestion() == null || user.getSecurityAnswerHash() == null) {
      throw new IllegalArgumentException("Security question is not set for this account");
    }
    if (!user.getSecurityQuestion().equals(q)) {
      throw new IllegalArgumentException("Wrong security question");
    }
    String a = normalizeSecurityAnswer(answer);
    if (!BCrypt.checkpw(a, user.getSecurityAnswerHash())) {
      throw new IllegalArgumentException("Wrong answer");
    }
    String token = newToken();
    pinRecoveryTokens.put(token, new RecoveryToken(user.getId(), System.currentTimeMillis() + PIN_RECOVERY_TTL_MS));
    return token;
  }

  public void resetPin(String recoveryToken, String pin) {
    validatePin(pin);
    String token = recoveryToken == null ? "" : recoveryToken.trim();
    if (token.isEmpty()) throw new IllegalArgumentException("Recovery token is required");
    RecoveryToken recovery = pinRecoveryTokens.remove(token);
    if (recovery == null || System.currentTimeMillis() > recovery.expiresAtMs()) {
      throw new IllegalArgumentException("Recovery session expired. Start forgot PIN again.");
    }
    User user =
        userRepository
            .findById(recovery.userId())
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));
    user.setPinHash(BCrypt.hashpw(pin.trim(), BCrypt.gensalt()));
    userRepository.save(user);
  }

  public AuthResponse loginEmail(String rawEmail) {
    String email = rawEmail.trim().toLowerCase();
    if (email.isBlank() || !email.contains("@")) {
      throw new IllegalArgumentException("Enter a valid email address");
    }
    User user =
        userRepository
            .findByEmail(email)
            .orElseGet(
                () -> {
                  String local =
                      email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
                  User u = new User();
                  u.setEmail(email);
                  u.setDisplayName(capitalize(local));
                  u.setGameTag(generateUniqueGameTag(u.getDisplayName(), email));
                  u.setAuthToken(newToken());
                  u.setCreatedAt(Instant.now());
                  u.setPlanType("FREE");
                  u.setPlanStatus("ACTIVE");
                  return userRepository.save(u);
                });
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  /** Sign in by phone only (no auto-register). */
  public AuthResponse loginPhoneExisting(String rawPhone) {
    String phone = normalizePhone(rawPhone);
    if (phone.length() < 8 || phone.length() > 15) {
      throw new IllegalArgumentException("Enter a valid phone number with country code");
    }
    User user =
        userRepository
            .findByPhone(phone)
            .orElseThrow(() -> new IllegalArgumentException("No account found. Please sign up."));
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  /** Sign in by email only (no auto-register). */
  public AuthResponse loginEmailExisting(String rawEmail) {
    String email = rawEmail.trim().toLowerCase();
    if (email.isBlank() || !email.contains("@")) {
      throw new IllegalArgumentException("Enter a valid email address");
    }
    User user =
        userRepository
            .findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("No account found. Please sign up."));
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
      user = userRepository.save(user);
    }
    return authResponse(user);
  }

  /** Creates a new user (or logs in if already exists) with profile fields from the signup flow. */
  public AuthResponse signup(
      String method,
      String identifier,
      String rawGameTag,
      String rawName,
      String avatarKey,
      String pin,
      String securityQuestion,
      String securityAnswer,
      java.util.List<Double> faceEncoding,
      String googleCredential)
      throws GeneralSecurityException, IOException {
    String m = method == null ? "" : method.trim().toLowerCase();
    String name = rawName == null ? "" : rawName.trim();
    if (name.isBlank()) throw new IllegalArgumentException("Full name is required");
    String tag = normalizeGameTag(rawGameTag);
    if (tag.length() < 4) throw new IllegalArgumentException("Game tag must be at least 4 characters");
    userRepository.findByGameTag(tag).ifPresent(u -> { throw new IllegalArgumentException("Game tag is already taken"); });

    if ("email".equals(m)) {
      String email = identifier == null ? "" : identifier.trim().toLowerCase();
      if (email.isBlank() || !email.contains("@")) throw new IllegalArgumentException("Enter a valid email address");
      return signupEmail(email, name, tag, avatarKey, pin, securityQuestion, securityAnswer, faceEncoding);
    }
    if ("phone".equals(m)) {
      String phone = normalizePhone(identifier == null ? "" : identifier);
      if (phone.length() < 8 || phone.length() > 15) {
        throw new IllegalArgumentException("Enter a valid phone number with country code");
      }
      return signupPhone(phone, name, tag, avatarKey, pin, securityQuestion, securityAnswer, faceEncoding);
    }
    if ("google".equals(m)) {
      if (googleCredential == null || googleCredential.isBlank()) {
        throw new IllegalArgumentException("Missing Google credential");
      }
      // Verify token and either link to existing or create a new user, but force gameTag/name from signup.
      GoogleIdToken idToken = verifyGoogleIdToken(googleCredential);
      GoogleIdToken.Payload payload = idToken.getPayload();
      String sub = payload.getSubject();
      String email = (String) payload.get("email");
      Boolean emailVerified = (Boolean) payload.get("email_verified");
      String picture = (String) payload.get("picture");
      if (email == null || email.isBlank()) throw new IllegalArgumentException("Google account has no email");
      if (Boolean.FALSE.equals(emailVerified)) throw new IllegalArgumentException("Google email is not verified");
      email = email.trim().toLowerCase();

      Optional<User> bySub = userRepository.findByGoogleSub(sub);
      if (bySub.isPresent()) {
        User u = bySub.get();
        u.setDisplayName(name);
        u.setGameTag(tag);
        if (avatarKey != null) {
          String a = avatarKey.trim();
          u.setAvatarKey(a.isEmpty() ? null : a);
        }
        if ((u.getProfilePhotoUrl() == null || u.getProfilePhotoUrl().isBlank())
            && picture != null
            && !picture.isBlank()) {
          u.setProfilePhotoUrl(picture);
        }
        if (faceEncoding != null && !faceEncoding.isEmpty()) {
          u.setFaceEncoding(new java.util.ArrayList<>(faceEncoding));
          u.setFaceLoginEnabled(true);
        }
        return ensureSession(userRepository.save(u));
      }

      Optional<User> byEmail = userRepository.findByEmail(email);
      if (byEmail.isPresent()) {
        User u = byEmail.get();
        u.setGoogleSub(sub);
        u.setDisplayName(name);
        u.setGameTag(tag);
        if (avatarKey != null) {
          String a = avatarKey.trim();
          u.setAvatarKey(a.isEmpty() ? null : a);
        }
        if ((u.getProfilePhotoUrl() == null || u.getProfilePhotoUrl().isBlank())
            && picture != null
            && !picture.isBlank()) {
          u.setProfilePhotoUrl(picture);
        }
        if (faceEncoding != null && !faceEncoding.isEmpty()) {
          u.setFaceEncoding(new java.util.ArrayList<>(faceEncoding));
          u.setFaceLoginEnabled(true);
        }
        if (u.getAuthToken() == null || u.getAuthToken().isBlank()) {
          u.setAuthToken(newToken());
        }
        return authResponse(userRepository.save(u));
      }

      User user = new User();
      user.setGoogleSub(sub);
      user.setEmail(email);
      user.setDisplayName(name);
      user.setGameTag(tag);
      if (avatarKey != null) {
        String a = avatarKey.trim();
        user.setAvatarKey(a.isEmpty() ? null : a);
      }
      if (picture != null && !picture.isBlank()) {
        user.setProfilePhotoUrl(picture);
      }
      if (faceEncoding != null && !faceEncoding.isEmpty()) {
        user.setFaceEncoding(new java.util.ArrayList<>(faceEncoding));
        user.setFaceLoginEnabled(true);
      }
      applyPinAndSecurity(user, pin, securityQuestion, securityAnswer);
      user.setAuthToken(newToken());
      user.setCreatedAt(Instant.now());
      user.setPlanType("FREE");
      user.setPlanStatus("ACTIVE");
      return authResponse(userRepository.save(user));
    }

    throw new IllegalArgumentException("method must be email, phone, or google");
  }

  private AuthResponse signupEmail(
      String email,
      String name,
      String gameTag,
      String avatarKey,
      String pin,
      String securityQuestion,
      String securityAnswer,
      java.util.List<Double> faceEncoding) {
    Optional<User> existing = userRepository.findByEmail(email);
    if (existing.isPresent()) {
      return ensureSession(existing.get());
    }
    User u = new User();
    u.setEmail(email);
    u.setDisplayName(name);
    u.setGameTag(gameTag);
    if (avatarKey != null) {
      String a = avatarKey.trim();
      u.setAvatarKey(a.isEmpty() ? null : a);
    }
    if (faceEncoding != null && !faceEncoding.isEmpty()) {
      u.setFaceEncoding(new java.util.ArrayList<>(faceEncoding));
      u.setFaceLoginEnabled(true);
    }
    applyPinAndSecurity(u, pin, securityQuestion, securityAnswer);
    u.setAuthToken(newToken());
    u.setCreatedAt(Instant.now());
    u.setPlanType("FREE");
    u.setPlanStatus("ACTIVE");
    return authResponse(userRepository.save(u));
  }

  private AuthResponse signupPhone(
      String phone,
      String name,
      String gameTag,
      String avatarKey,
      String pin,
      String securityQuestion,
      String securityAnswer,
      java.util.List<Double> faceEncoding) {
    Optional<User> existing = userRepository.findByPhone(phone);
    if (existing.isPresent()) {
      return ensureSession(existing.get());
    }
    User u = new User();
    u.setPhone(phone);
    u.setDisplayName(name);
    u.setGameTag(gameTag);
    if (avatarKey != null) {
      String a = avatarKey.trim();
      u.setAvatarKey(a.isEmpty() ? null : a);
    }
    if (faceEncoding != null && !faceEncoding.isEmpty()) {
      u.setFaceEncoding(new java.util.ArrayList<>(faceEncoding));
      u.setFaceLoginEnabled(true);
    }
    applyPinAndSecurity(u, pin, securityQuestion, securityAnswer);
    u.setAuthToken(newToken());
    u.setCreatedAt(Instant.now());
    u.setPlanType("FREE");
    u.setPlanStatus("ACTIVE");
    return authResponse(userRepository.save(u));
  }

  /**
   * Verifies the Google ID token (GIS credential JWT) and signs the user in or registers them.
   */
  public AuthResponse loginWithGoogle(String credentialJwt)
      throws GeneralSecurityException, IOException {
    if (credentialJwt == null || credentialJwt.isBlank()) {
      throw new IllegalArgumentException("Missing Google credential");
    }
    if (googleClientId.isEmpty()) {
      throw new IllegalStateException("Google sign-in is not configured (set GOOGLE_CLIENT_ID)");
    }

    GoogleIdToken idToken = verifyGoogleIdToken(credentialJwt);
    GoogleIdToken.Payload payload = idToken.getPayload();
    String sub = payload.getSubject();
    String email = (String) payload.get("email");
    Boolean emailVerified = (Boolean) payload.get("email_verified");
    String name = (String) payload.get("name");
    String picture = (String) payload.get("picture");

    if (email == null || email.isBlank()) {
      throw new IllegalArgumentException("Google account has no email");
    }
    if (Boolean.FALSE.equals(emailVerified)) {
      throw new IllegalArgumentException("Google email is not verified");
    }
    email = email.trim().toLowerCase();

    Optional<User> bySub = userRepository.findByGoogleSub(sub);
    if (bySub.isPresent()) {
      return ensureSession(bySub.get());
    }

    Optional<User> byEmail = userRepository.findByEmail(email);
    if (byEmail.isPresent()) {
      User u = byEmail.get();
      u.setGoogleSub(sub);
      if (u.getDisplayName() == null || u.getDisplayName().isBlank()) {
        u.setDisplayName(displayNameFromEmailOrName(email, name));
      }
      if (u.getGameTag() == null || u.getGameTag().isBlank()) {
        u.setGameTag(generateUniqueGameTag(u.getDisplayName(), email));
      }
      if ((u.getProfilePhotoUrl() == null || u.getProfilePhotoUrl().isBlank())
          && picture != null
          && !picture.isBlank()) {
        u.setProfilePhotoUrl(picture);
      }
      if (u.getAuthToken() == null || u.getAuthToken().isBlank()) {
        u.setAuthToken(newToken());
      }
      return authResponse(userRepository.save(u));
    }

    User user = new User();
    user.setGoogleSub(sub);
    user.setEmail(email);
    user.setDisplayName(displayNameFromEmailOrName(email, name));
    user.setGameTag(generateUniqueGameTag(user.getDisplayName(), email));
    if (picture != null && !picture.isBlank()) {
      user.setProfilePhotoUrl(picture);
    }
    user.setAuthToken(newToken());
    user.setCreatedAt(Instant.now());
    user.setPlanType("FREE");
    user.setPlanStatus("ACTIVE");
    return authResponse(userRepository.save(user));
  }

  private GoogleIdToken verifyGoogleIdToken(String credentialJwt)
      throws GeneralSecurityException, IOException {
    GoogleIdTokenVerifier verifier =
        new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(Collections.singletonList(googleClientId))
            .build();
    GoogleIdToken token = verifier.verify(credentialJwt);
    if (token == null) {
      throw new IllegalArgumentException("Invalid Google credential");
    }
    return token;
  }

  private AuthResponse ensureSession(User user) {
    if (user.getAuthToken() == null || user.getAuthToken().isBlank()) {
      user.setAuthToken(newToken());
    }
    if (user.getGameTag() == null || user.getGameTag().isBlank()) {
      user.setGameTag(generateUniqueGameTag(user.getDisplayName(), user.getEmail()));
    }
    user = userRepository.save(user);
    return authResponse(user);
  }

  private static String displayNameFromEmailOrName(String email, String name) {
    if (name != null && !name.isBlank()) {
      return name.trim();
    }
    int at = email.indexOf('@');
    return capitalize(at > 0 ? email.substring(0, at) : email);
  }

  private AuthResponse authResponse(User user) {
    user.setLastLogin(Instant.now());
    user = userRepository.save(user);
    walletService.grantStarterCreditsIfNeeded(user);
    UserProfileDto dto = userMapper.toDto(user);
    return new AuthResponse(user.getAuthToken(), dto);
  }

  private static String newToken() {
    return UUID.randomUUID().toString().replace("-", "")
        + UUID.randomUUID().toString().replace("-", "");
  }

  private static String normalizePhone(String raw) {
    return raw.replaceAll("\\D", "");
  }

  private static void validatePin(String pin) {
    String p = pin == null ? "" : pin.trim();
    if (!p.matches("\\d{4}")) {
      throw new IllegalArgumentException("PIN must be exactly 4 digits");
    }
  }

  private static String normalizeSecurityAnswer(String answer) {
    String a = answer == null ? "" : answer.trim().toLowerCase().replaceAll("\\s+", " ");
    if (a.length() < 2) throw new IllegalArgumentException("Security answer is required");
    return a;
  }

  private static String normalizeSecurityQuestion(String question) {
    String q = question == null ? "" : question.trim();
    if (!ALLOWED_SECURITY_QUESTIONS.contains(q)) {
      throw new IllegalArgumentException("Please choose a valid security question");
    }
    return q;
  }

  private static void applyPinAndSecurity(User u, String pin, String securityQuestion, String securityAnswer) {
    if (pin != null && !pin.trim().isEmpty()) {
      validatePin(pin);
      u.setPinHash(BCrypt.hashpw(pin.trim(), BCrypt.gensalt()));
    }
    if ((securityQuestion != null && !securityQuestion.trim().isEmpty())
        || (securityAnswer != null && !securityAnswer.trim().isEmpty())) {
      String q = normalizeSecurityQuestion(securityQuestion);
      String a = normalizeSecurityAnswer(securityAnswer);
      u.setSecurityQuestion(q);
      u.setSecurityAnswerHash(BCrypt.hashpw(a, BCrypt.gensalt()));
    }
  }

  private record RecoveryToken(String userId, long expiresAtMs) {}

  private static String capitalize(String s) {
    if (s == null || s.isEmpty()) {
      return "Player";
    }
    return Character.toUpperCase(s.charAt(0)) + s.substring(1);
  }

  private static String normalizeGameTag(String raw) {
    if (raw == null) return "";
    String compact = raw.trim().replaceAll("\\s+", "");
    return compact.replaceAll("[^A-Za-z0-9_]", "");
  }

  private String generateUniqueGameTag(String sourceName, String sourceId) {
    String baseName = sourceName == null ? "Player" : sourceName;
    String slug = baseName.replaceAll("[^A-Za-z0-9]", "");
    if (slug.length() < 4) {
      slug = "Player";
    }
    if (slug.length() > 12) {
      slug = slug.substring(0, 12);
    }
    String digits = sourceId == null ? "" : sourceId.replaceAll("\\D", "");
    String suffix = digits.length() >= 4 ? digits.substring(digits.length() - 4) : "";
    for (int i = 0; i < 20; i++) {
      String randomPart = String.format("%04d", (int) (Math.random() * 10_000));
      String candidate = slug + (suffix.isBlank() ? randomPart : suffix);
      if (candidate.length() > 24) {
        candidate = candidate.substring(0, 24);
      }
      if (userRepository.findByGameTag(candidate).isEmpty()) {
        return candidate;
      }
      suffix = randomPart;
    }
    return slug + System.currentTimeMillis() % 10_000;
  }
}
