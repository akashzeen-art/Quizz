package com.nserve.quiz.api;

import com.nserve.quiz.dto.PdfQuizUploadResultDto;
import com.nserve.quiz.security.CurrentAdmin;
import com.nserve.quiz.service.PdfQuizUploadService;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/admin")
public class AdminPdfController {

  private static final long MAX_BYTES = 15 * 1024 * 1024; // 15 MB

  private final PdfQuizUploadService pdfQuizUploadService;

  public AdminPdfController(PdfQuizUploadService pdfQuizUploadService) {
    this.pdfQuizUploadService = pdfQuizUploadService;
  }

  @PostMapping(value = "/upload-pdf/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public PdfQuizUploadResultDto preview(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "category", defaultValue = "general") String category)
      throws IOException {
    validatePdf(file);
    return pdfQuizUploadService.parseAndOptionallySave(file, category, false);
  }

  @PostMapping(value = "/upload-pdf/save", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public PdfQuizUploadResultDto save(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "category", defaultValue = "general") String category)
      throws IOException {
    validatePdf(file);
    return pdfQuizUploadService.parseAndOptionallySave(file, category, true);
  }

  private static void validatePdf(MultipartFile file) {
    if (file.isEmpty()) throw new IllegalArgumentException("File is empty");
    String name = file.getOriginalFilename();
    if (name == null || !name.toLowerCase().endsWith(".pdf")) {
      throw new IllegalArgumentException("Only .pdf files are accepted");
    }
    if (file.getSize() > MAX_BYTES) {
      throw new IllegalArgumentException("File exceeds 15 MB limit");
    }
  }
}
