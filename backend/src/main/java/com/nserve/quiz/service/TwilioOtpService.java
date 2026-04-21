package com.nserve.quiz.service;

import com.twilio.Twilio;
import com.twilio.exception.ApiException;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TwilioOtpService {

  private final String accountSid;
  private final String authToken;
  private final String verifyServiceSid;
  private final boolean mockEnabled;
  private final String mockCode;
  private final Map<String, String> mockOtpByPhone = new ConcurrentHashMap<>();
  private final Map<String, Long> lastOtpSentAtMs = new ConcurrentHashMap<>();
  private final Map<String, Integer> verifyAttempts = new ConcurrentHashMap<>();
  private final Map<String, Long> mockOtpExpiresAtMs = new ConcurrentHashMap<>();
  private static final long MIN_SEND_INTERVAL_MS = 45_000L;
  private static final long MOCK_OTP_TTL_MS = 2 * 60_000L;
  private static final int MAX_VERIFY_ATTEMPTS = 5;

  public TwilioOtpService(
      @Value("${app.twilio.account-sid:}") String accountSid,
      @Value("${app.twilio.auth-token:}") String authToken,
      @Value("${app.twilio.verify-service-sid:}") String verifyServiceSid,
      @Value("${app.twilio.mock-enabled:false}") boolean mockEnabled,
      @Value("${app.twilio.mock-code:123456}") String mockCode) {
    this.accountSid = accountSid != null ? accountSid.trim() : "";
    this.authToken = authToken != null ? authToken.trim() : "";
    this.verifyServiceSid = verifyServiceSid != null ? verifyServiceSid.trim() : "";
    this.mockEnabled = mockEnabled;
    this.mockCode = (mockCode == null || mockCode.trim().isEmpty()) ? "123456" : mockCode.trim();
  }

  public void sendOtp(String phoneE164) {
    String to = normalizeE164(phoneE164);
    enforceSendRateLimit(to);
    if (mockEnabled) {
      mockOtpByPhone.put(to, mockCode);
      mockOtpExpiresAtMs.put(to, System.currentTimeMillis() + MOCK_OTP_TTL_MS);
      verifyAttempts.put(to, 0);
      lastOtpSentAtMs.put(to, System.currentTimeMillis());
      return;
    }
    ensureConfigured();
    Twilio.init(accountSid, authToken);
    try {
      Verification.creator(verifyServiceSid, to, "sms").create();
      verifyAttempts.put(to, 0);
      lastOtpSentAtMs.put(to, System.currentTimeMillis());
    } catch (ApiException e) {
      throw mapTwilioApiException(e);
    }
  }

  public boolean verifyOtp(String phoneE164, String code) {
    String to = normalizeE164(phoneE164);
    if (code == null || code.trim().isEmpty()) throw new IllegalArgumentException("OTP code is required");
    int used = verifyAttempts.getOrDefault(to, 0);
    if (used >= MAX_VERIFY_ATTEMPTS) {
      throw new IllegalArgumentException("Max OTP attempts reached. Please request a new OTP.");
    }
    if (mockEnabled) {
      Long expiresAt = mockOtpExpiresAtMs.get(to);
      if (expiresAt == null || System.currentTimeMillis() > expiresAt) {
        mockOtpByPhone.remove(to);
        throw new IllegalArgumentException("OTP expired. Please request a new OTP.");
      }
      String expected = mockOtpByPhone.get(to);
      boolean ok = expected != null && expected.equals(code.trim());
      verifyAttempts.put(to, used + 1);
      if (ok) {
        clearOtpState(to);
      }
      return ok;
    }
    ensureConfigured();
    Twilio.init(accountSid, authToken);
    try {
      VerificationCheck check =
          VerificationCheck.creator(verifyServiceSid).setTo(to).setCode(code.trim()).create();
      verifyAttempts.put(to, used + 1);
      boolean approved = "approved".equalsIgnoreCase(check.getStatus());
      if (approved) {
        clearOtpState(to);
      }
      return approved;
    } catch (ApiException e) {
      throw mapTwilioApiException(e);
    }
  }

  private void ensureConfigured() {
    if (accountSid.isEmpty() || authToken.isEmpty() || verifyServiceSid.isEmpty()) {
      throw new IllegalStateException("Twilio OTP is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID)");
    }
  }

  private static String normalizeE164(String raw) {
    if (raw == null) throw new IllegalArgumentException("Phone is required");
    String p = raw.trim();
    if (!p.startsWith("+")) {
      throw new IllegalArgumentException("Phone must be in E.164 format, e.g. +919876543210");
    }
    String digits = p.replaceAll("\\D", "");
    if (digits.length() < 8 || digits.length() > 15) {
      throw new IllegalArgumentException("Enter a valid phone number with country code");
    }
    return "+" + digits;
  }

  private RuntimeException mapTwilioApiException(ApiException e) {
    String msg = e.getMessage() == null ? "" : e.getMessage();
    String normalized = msg.toLowerCase();
    if (normalized.contains("unverified") && normalized.contains("trial")) {
      return new IllegalStateException(
          "Twilio trial account cannot send OTP to unverified numbers. Verify the destination number in Twilio Console, upgrade account, or enable app.twilio.mock-enabled=true for local testing.");
    }
    if (e.getStatusCode() == 401 || e.getStatusCode() == 403) {
      return new IllegalStateException("Twilio authentication failed. Check account SID, auth token, and verify service SID.");
    }
    if (e.getStatusCode() != null && e.getStatusCode() >= 500) {
      return new IllegalStateException("Twilio service is currently unavailable. Please try again.");
    }
    return new IllegalArgumentException("Twilio error: " + msg);
  }

  private void enforceSendRateLimit(String to) {
    Long lastSent = lastOtpSentAtMs.get(to);
    long now = System.currentTimeMillis();
    if (lastSent != null && now - lastSent < MIN_SEND_INTERVAL_MS) {
      long waitSec = Math.max(1, (MIN_SEND_INTERVAL_MS - (now - lastSent)) / 1000);
      throw new IllegalArgumentException("Please wait " + waitSec + "s before requesting OTP again");
    }
  }

  private void clearOtpState(String to) {
    verifyAttempts.remove(to);
    mockOtpByPhone.remove(to);
    mockOtpExpiresAtMs.remove(to);
  }
}

