package com.nserve.quiz.api;

import com.nserve.quiz.domain.User;
import com.nserve.quiz.dto.DeductCreditsRequest;
import com.nserve.quiz.dto.DeductCreditsResponse;
import com.nserve.quiz.dto.QuizDetailResponse;
import com.nserve.quiz.dto.QuizDto;
import com.nserve.quiz.dto.SubmitAnswerRequest;
import com.nserve.quiz.dto.SubmitAnswerResponse;
import com.nserve.quiz.security.CurrentUser;
import com.nserve.quiz.service.QuizService;
import com.nserve.quiz.service.WalletService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class QuizController {

  private final QuizService quizService;
  private final WalletService walletService;

  public QuizController(QuizService quizService, WalletService walletService) {
    this.quizService = quizService;
    this.walletService = walletService;
  }

  @GetMapping("/quiz/list")
  public List<QuizDto> list() {
    return quizService.listQuizzes();
  }

  @GetMapping("/quiz/{id}")
  public QuizDetailResponse detail(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @PathVariable String id,
      @RequestHeader(value = "X-Quiz-Play-Ref", required = false) String playRef) {
    return quizService.getQuizForUser(user, id, playRef);
  }

  @PostMapping("/quiz/deduct-credits")
  public DeductCreditsResponse deductCredits(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody DeductCreditsRequest body) {
    return walletService.deductForQuiz(user, body.quizId(), body.clientRequestId());
  }

  @PostMapping("/quiz/submit-answer")
  public SubmitAnswerResponse submit(
      @RequestAttribute(CurrentUser.ATTR) User user,
      @Valid @RequestBody SubmitAnswerRequest body) {
    return quizService.submitAnswer(user, body);
  }
}
