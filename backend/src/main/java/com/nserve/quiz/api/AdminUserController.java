package com.nserve.quiz.api;

import com.nserve.quiz.dto.AdminUserPageDto;
import com.nserve.quiz.security.CurrentAdmin;
import com.nserve.quiz.service.AdminUserService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/users")
public class AdminUserController {

  private final AdminUserService adminUserService;

  public AdminUserController(AdminUserService adminUserService) {
    this.adminUserService = adminUserService;
  }

  @GetMapping
  public AdminUserPageDto list(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "all") String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Pageable p =
        PageRequest.of(
            Math.max(0, page),
            Math.min(100, Math.max(1, size)),
            Sort.by(Sort.Direction.DESC, "id"));
    return adminUserService.list(search, status, p);
  }

  @GetMapping("/active")
  public AdminUserPageDto active(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Pageable p =
        PageRequest.of(
            Math.max(0, page),
            Math.min(100, Math.max(1, size)),
            Sort.by(Sort.Direction.DESC, "id"));
    return adminUserService.list(search, "active", p);
  }

  @GetMapping("/inactive")
  public AdminUserPageDto inactive(
      @RequestAttribute(CurrentAdmin.ATTR) String adminEmail,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Pageable p =
        PageRequest.of(
            Math.max(0, page),
            Math.min(100, Math.max(1, size)),
            Sort.by(Sort.Direction.DESC, "id"));
    return adminUserService.list(search, "inactive", p);
  }
}
