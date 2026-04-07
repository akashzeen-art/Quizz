package com.nserve.quiz.api;

import com.nserve.quiz.dto.CsvUploadResult;
import com.nserve.quiz.security.CurrentAdmin;
import com.nserve.quiz.service.CsvUploadService;
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
public class AdminCsvController {

  private static final long MAX_BYTES = 5 * 1024 * 1024; // 5 MB

  private final CsvUploadService csvUploadService;

  public AdminCsvController(CsvUploadService csvUploadService) {
    this.csvUploadService = csvUploadService;
  }

  @PostMapping(value = "/upload-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public CsvUploadResult upload(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestParam("file") MultipartFile file,
      @RequestParam(value = "category", defaultValue = "general") String category,
      @RequestParam(value = "titlePrefix", defaultValue = "Quiz Set") String titlePrefix,
      @RequestParam(value = "releaseSetNumber", defaultValue = "1") int releaseSetNumber)
      throws IOException {

    if (file.isEmpty()) throw new IllegalArgumentException("File is empty");
    String originalName = file.getOriginalFilename();
    if (originalName == null || !originalName.toLowerCase().endsWith(".csv"))
      throw new IllegalArgumentException("Only .csv files are accepted");
    if (file.getSize() > MAX_BYTES)
      throw new IllegalArgumentException("File exceeds 5 MB limit");
    return csvUploadService.process(file, category, titlePrefix, releaseSetNumber);
  }
}
