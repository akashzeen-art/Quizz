package com.nserve.quiz.service;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.AdminUserPageDto;
import com.nserve.quiz.dto.AdminUserRowDto;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
public class AdminUserService {

  private final MongoTemplate mongoTemplate;
  private final int activeWindowMinutes;

  public AdminUserService(
      MongoTemplate mongoTemplate,
      @Value("${app.admin.active-window-minutes:15}") int activeWindowMinutes) {
    this.mongoTemplate = mongoTemplate;
    this.activeWindowMinutes = activeWindowMinutes;
  }

  public AdminUserPageDto list(
      String search, String status, Pageable pageable) {
    Query q = new Query();
    if (search != null && !search.isBlank()) {
      String term = search.trim();
      Criteria or =
          new Criteria()
              .orOperator(
                  Criteria.where("displayName").regex(term, "i"),
                  Criteria.where("email").regex(term, "i"),
                  Criteria.where("phone").regex(term, "i"));
      q.addCriteria(or);
    }
    Instant cutoff = Instant.now().minus(activeWindowMinutes, ChronoUnit.MINUTES);
    if ("active".equalsIgnoreCase(status)) {
      q.addCriteria(Criteria.where("lastActiveAt").gte(cutoff));
    } else if ("inactive".equalsIgnoreCase(status)) {
      q.addCriteria(
          new Criteria()
              .orOperator(
                  Criteria.where("lastActiveAt").lt(cutoff),
                  Criteria.where("lastActiveAt").is(null)));
    }

    long total = mongoTemplate.count(q, User.class);
    q.with(pageable);
    List<User> users = mongoTemplate.find(q, User.class);
    List<AdminUserRowDto> rows =
        users.stream().map(u -> toRow(u, cutoff)).collect(Collectors.toList());
    int totalPages = pageable.getPageSize() == 0 ? 0 : (int) Math.ceil((double) total / pageable.getPageSize());
    return new AdminUserPageDto(
        rows,
        total,
        totalPages,
        pageable.getPageNumber(),
        pageable.getPageSize());
  }

  private AdminUserRowDto toRow(User u, Instant cutoff) {
    String status =
        u.getLastActiveAt() != null && !u.getLastActiveAt().isBefore(cutoff)
            ? "ACTIVE"
            : "INACTIVE";
    return new AdminUserRowDto(
        u.getId(),
        u.getDisplayName() != null ? u.getDisplayName() : "Player",
        u.getEmail(),
        u.getPhone(),
        status,
        u.getTotalScore(),
        u.getLastActiveAt());
  }
}
