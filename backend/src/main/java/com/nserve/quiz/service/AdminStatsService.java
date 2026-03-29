package com.nserve.quiz.service;

import com.nserve.quiz.domain.Result;
import com.nserve.quiz.dto.AdminChartsResponse;
import com.nserve.quiz.dto.AdminStatsResponse;
import com.nserve.quiz.dto.ChartPointDto;
import com.nserve.quiz.repo.QuestionRepository;
import com.nserve.quiz.repo.QuizRepository;
import com.nserve.quiz.repo.ResultRepository;
import com.nserve.quiz.repo.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdminStatsService {

  private final UserRepository userRepository;
  private final QuizRepository quizRepository;
  private final QuestionRepository questionRepository;
  private final ResultRepository resultRepository;
  private final int activeWindowMinutes;

  public AdminStatsService(
      UserRepository userRepository,
      QuizRepository quizRepository,
      QuestionRepository questionRepository,
      ResultRepository resultRepository,
      @Value("${app.admin.active-window-minutes:15}") int activeWindowMinutes) {
    this.userRepository = userRepository;
    this.quizRepository = quizRepository;
    this.questionRepository = questionRepository;
    this.resultRepository = resultRepository;
    this.activeWindowMinutes = activeWindowMinutes;
  }

  public AdminStatsResponse stats() {
    long totalUsers = userRepository.count();
    Instant cutoff = Instant.now().minus(activeWindowMinutes, ChronoUnit.MINUTES);
    long activeUsers = userRepository.countByLastActiveAtGreaterThanEqual(cutoff);
    long inactiveUsers = Math.max(0, totalUsers - activeUsers);
    return new AdminStatsResponse(
        totalUsers,
        activeUsers,
        inactiveUsers,
        quizRepository.count(),
        questionRepository.count(),
        activeWindowMinutes);
  }

  public AdminChartsResponse charts(int days) {
    int d = Math.min(Math.max(days, 7), 90);
    Instant since = Instant.now().minus(d, ChronoUnit.DAYS);
    List<Result> results = resultRepository.findByAnsweredAtAfter(since);

    Map<LocalDate, Long> participation = new HashMap<>();
    Map<LocalDate, Set<String>> distinctUsers = new HashMap<>();
    for (Result r : results) {
      if (r.getAnsweredAt() == null) {
        continue;
      }
      LocalDate day = LocalDate.ofInstant(r.getAnsweredAt(), ZoneOffset.UTC);
      participation.merge(day, 1L, Long::sum);
      distinctUsers.computeIfAbsent(day, k -> new HashSet<>()).add(r.getUserId());
    }

    List<LocalDate> timeline = new ArrayList<>();
    LocalDate end = LocalDate.now(ZoneOffset.UTC);
    LocalDate start = end.minusDays(d - 1L);
    for (LocalDate x = start; !x.isAfter(end); x = x.plusDays(1)) {
      timeline.add(x);
    }

    List<ChartPointDto> partPoints = new ArrayList<>();
    List<ChartPointDto> dauPoints = new ArrayList<>();
    for (LocalDate day : timeline) {
      String ds = day.toString();
      partPoints.add(new ChartPointDto(ds, participation.getOrDefault(day, 0L)));
      int du = distinctUsers.getOrDefault(day, Set.of()).size();
      dauPoints.add(new ChartPointDto(ds, du));
    }
    return new AdminChartsResponse(partPoints, dauPoints);
  }
}
