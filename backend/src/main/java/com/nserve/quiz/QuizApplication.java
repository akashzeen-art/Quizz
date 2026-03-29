package com.nserve.quiz;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class QuizApplication {

  public static void main(String[] args) {
    warnIfUnsupportedJdkForAtlas();
    configureTlsForMongoAtlas();
    loadLocalEnv();
    SpringApplication.run(QuizApplication.class, args);
  }

  /**
   * JDK 25+ frequently fails TLS handshake to MongoDB Atlas ({@code internal_error}). Project targets
   * JDK 21 LTS; use {@code ./run-dev.sh} on macOS or set {@code JAVA_HOME} to a 21 install.
   */
  private static void warnIfUnsupportedJdkForAtlas() {
    int v = Runtime.version().feature();
    if (v >= 25) {
      System.err.println(
          "[quiz-api] WARNING: Running on Java "
              + v
              + ". MongoDB Atlas TLS often fails on JDK 25+. Install JDK 21 (Temurin), set JAVA_HOME, "
              + "or run: ./run-dev.sh");
    }
  }

  /**
   * Avoids TLS handshake failures ({@code SSLException: Received fatal alert: internal_error}) seen
   * with some JDKs connecting to Atlas. Override with {@code -Djdk.tls.client.protocols=...} if
   * needed.
   */
  private static void configureTlsForMongoAtlas() {
    if (System.getProperty("jdk.tls.client.protocols") == null
        || System.getProperty("jdk.tls.client.protocols").isBlank()) {
      System.setProperty("jdk.tls.client.protocols", "TLSv1.2");
    }
  }

  /** Loads {@code backend/.env} when present (gitignored). Env vars take precedence. */
  private static void loadLocalEnv() {
    try {
      Dotenv dotenv = Dotenv.configure().directory("./").ignoreIfMissing().load();
      dotenv
          .entries()
          .forEach(
              e -> {
                String key = e.getKey();
                if (System.getenv(key) == null || System.getenv(key).isEmpty()) {
                  System.setProperty(key, e.getValue());
                }
              });
    } catch (Exception ignored) {
      // optional file
    }
  }
}
