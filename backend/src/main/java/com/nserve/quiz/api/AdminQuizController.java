package com.nserve.quiz.api;

import com.nserve.quiz.dto.AdminQuizBulkStatusRequest;
import com.nserve.quiz.dto.AdminQuizBulkDeleteRequest;
import com.nserve.quiz.dto.AdminQuizCreateRequest;
import com.nserve.quiz.dto.AdminQuizStatusUpdateRequest;
import com.nserve.quiz.dto.AdminQuizSummaryDto;
import com.nserve.quiz.security.CurrentAdmin;
import com.nserve.quiz.service.AdminQuizService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/quiz")
public class AdminQuizController {

  private final AdminQuizService adminQuizService;

  public AdminQuizController(AdminQuizService adminQuizService) {
    this.adminQuizService = adminQuizService;
  }

  @PostMapping("/create")
  public AdminQuizSummaryDto create(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @Valid @RequestBody AdminQuizCreateRequest body) {
    return adminQuizService.create(body);
  }

  @GetMapping("/list")
  public List<AdminQuizSummaryDto> list(@RequestAttribute(CurrentAdmin.ATTR) String adminEmail) {
    return adminQuizService.listAll();
  }

  @DeleteMapping("/{id}")
  public void delete(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail, @PathVariable String id) {
    adminQuizService.delete(id);
  }

  @PostMapping("/{id}/status")
  public AdminQuizSummaryDto updateStatus(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @PathVariable String id,
      @Valid @RequestBody AdminQuizStatusUpdateRequest body) {
    return adminQuizService.updateStatus(id, body.status(), body.startsAt());
  }

  @PostMapping("/bulk-status")
  public List<AdminQuizSummaryDto> bulkStatus(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @Valid @RequestBody AdminQuizBulkStatusRequest body) {
    return adminQuizService.bulkUpdateStatus(body.quizIds(), body.status(), body.startsAt());
  }

  @PostMapping("/bulk-delete")
  public void bulkDelete(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @Valid @RequestBody AdminQuizBulkDeleteRequest body) {
    adminQuizService.bulkDelete(body.quizIds());
  }
}
