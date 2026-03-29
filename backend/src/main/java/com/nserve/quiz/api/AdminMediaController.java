package com.nserve.quiz.api;

import com.nserve.quiz.security.CurrentAdmin;
import com.nserve.quiz.service.FileStorageService;
import java.io.IOException;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin/media")
public class AdminMediaController {

  private final FileStorageService fileStorageService;

  public AdminMediaController(FileStorageService fileStorageService) {
    this.fileStorageService = fileStorageService;
  }

  @PostMapping("/upload")
  public Map<String, String> upload(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail, @RequestPart("file") MultipartFile file)
      throws IOException {
    String url = fileStorageService.saveAdminMedia(file);
    return Map.of("url", url);
  }

  /** PDF, DOC, DOCX, TXT — quiz source material. */
  @PostMapping("/upload-document")
  public Map<String, String> uploadDocument(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail, @RequestPart("file") MultipartFile file)
      throws IOException {
    String url = fileStorageService.saveAdminDocument(file);
    return Map.of("url", url);
  }
}
