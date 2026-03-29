package com.nserve.quiz.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

  private final Path uploadRoot;

  public FileStorageService(@Value("${app.upload.dir:uploads}") String dir) {
    this.uploadRoot = Paths.get(dir).toAbsolutePath().normalize();
  }

  public String saveProfilePhoto(String userId, MultipartFile file) throws IOException {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("Empty file");
    }
    String ct = file.getContentType();
    String ext;
    if (ct != null && ct.startsWith("image/")) {
      ext = extensionForContentType(ct);
    } else if (ct == null
        || ct.isBlank()
        || "application/octet-stream".equalsIgnoreCase(ct)) {
      ext = extensionFromOriginalName(file.getOriginalFilename());
    } else {
      throw new IllegalArgumentException("Only image uploads are allowed");
    }
    String filename = UUID.randomUUID().toString().replace("-", "") + ext;
    Path dir = uploadRoot.resolve("profile").resolve(userId);
    Files.createDirectories(dir);
    Path dest = dir.resolve(filename);
    Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
    return "/files/profile/" + userId + "/" + filename;
  }

  /**
   * Reference material for a quiz (PDF, Word, plain text). Returns path like {@code
   * /files/admin/documents/...}.
   */
  public String saveAdminDocument(MultipartFile file) throws IOException {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("Empty file");
    }
    String ct = file.getContentType();
    if (ct == null || ct.isBlank()) {
      throw new IllegalArgumentException("Content type required");
    }
    String ext = extensionForDocument(ct, file.getOriginalFilename());
    String filename = UUID.randomUUID().toString().replace("-", "") + ext;
    Path dir = uploadRoot.resolve("admin").resolve("documents");
    Files.createDirectories(dir);
    Path dest = dir.resolve(filename);
    Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
    return "/files/admin/documents/" + filename;
  }

  /** Quiz question media (image, gif, video, audio). Returns path like {@code /files/admin/media/...}. */
  public String saveAdminMedia(MultipartFile file) throws IOException {
    if (file.isEmpty()) {
      throw new IllegalArgumentException("Empty file");
    }
    String ct = file.getContentType();
    if (ct == null || ct.isBlank()) {
      throw new IllegalArgumentException("Content type required");
    }
    String ext = extensionForAdmin(ct, file.getOriginalFilename());
    String filename = UUID.randomUUID().toString().replace("-", "") + ext;
    Path dir = uploadRoot.resolve("admin").resolve("media");
    Files.createDirectories(dir);
    Path dest = dir.resolve(filename);
    Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
    return "/files/admin/media/" + filename;
  }

  private static String extensionForDocument(String contentType, String originalName) {
    String c = contentType.toLowerCase();
    if (c.contains("pdf")) {
      return ".pdf";
    }
    if (c.contains("wordprocessingml.document")) {
      return ".docx";
    }
    if (c.contains("msword")) {
      return ".doc";
    }
    if (c.startsWith("text/plain")) {
      return ".txt";
    }
    String n = originalName == null ? "" : originalName.toLowerCase();
    if (n.endsWith(".pdf")) return ".pdf";
    if (n.endsWith(".docx")) return ".docx";
    if (n.endsWith(".doc")) return ".doc";
    if (n.endsWith(".txt")) return ".txt";
    throw new IllegalArgumentException("Unsupported document type: " + contentType);
  }

  private static String extensionForAdmin(String contentType, String originalName) {
    String c = contentType.toLowerCase();
    if (c.startsWith("image/")) {
      return extensionForContentType(contentType);
    }
    if (c.startsWith("video/")) {
      if (c.contains("mp4")) return ".mp4";
      if (c.contains("webm")) return ".webm";
      return ".mp4";
    }
    if (c.startsWith("audio/")) {
      if (c.contains("mpeg") || c.contains("mp3")) return ".mp3";
      if (c.contains("wav")) return ".wav";
      return ".m4a";
    }
    if (c.equals("image/gif")) {
      return ".gif";
    }
    String n = originalName == null ? "" : originalName.toLowerCase();
    if (n.endsWith(".gif")) return ".gif";
    if (n.endsWith(".mp4")) return ".mp4";
    if (n.endsWith(".webm")) return ".webm";
    if (n.endsWith(".mp3")) return ".mp3";
    throw new IllegalArgumentException("Unsupported media type: " + contentType);
  }

  public void deleteIfExists(String profilePhotoUrl) {
    if (profilePhotoUrl == null || profilePhotoUrl.isBlank()) {
      return;
    }
    Path rel = urlToRelativePath(profilePhotoUrl);
    if (rel == null) {
      return;
    }
    Path full = uploadRoot.resolve(rel);
    try {
      Files.deleteIfExists(full);
    } catch (IOException ignored) {
      // best-effort cleanup
    }
  }

  private Path urlToRelativePath(String url) {
    if (!url.startsWith("/files/")) {
      return null;
    }
    String rest = url.substring("/files/".length());
    return Paths.get(rest);
  }

  private static String extensionForContentType(String contentType) {
    return switch (contentType) {
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      case "image/gif" -> ".gif";
      default -> ".jpg";
    };
  }

  private static String extensionFromOriginalName(String name) {
    if (name == null || !name.contains(".")) {
      return ".jpg";
    }
    String low = name.toLowerCase();
    if (low.endsWith(".png")) return ".png";
    if (low.endsWith(".webp")) return ".webp";
    if (low.endsWith(".gif")) return ".gif";
    if (low.endsWith(".jpeg") || low.endsWith(".jpg")) return ".jpg";
    return ".jpg";
  }
}
