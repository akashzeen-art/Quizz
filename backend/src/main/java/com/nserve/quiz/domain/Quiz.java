package com.nserve.quiz.domain;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "quizzes")
public class Quiz {

  @Id private String id;

  private String title;
  private String description;
  private QuizStatus status = QuizStatus.live;
  private Instant startsAt;
  /** Optional window end for scheduled events (null = open-ended while live). */
  private Instant endsAt;

  private List<String> questionIds;

  private int questionCount = 10;

  /** Primary category label (admin-created quizzes). */
  private String category;

  private Instant createdAt;

  /** Time allowed per question in seconds (default 15). */
  private int secondsPerQuestion = 15;

  /** Optional source material for this quiz (PDF/DOC path under {@code /files/...}). */
  private String referenceDocumentUrl;

  private String referenceDocumentName;

  public Quiz() {}

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public QuizStatus getStatus() {
    return status;
  }

  public void setStatus(QuizStatus status) {
    this.status = status;
  }

  public Instant getStartsAt() {
    return startsAt;
  }

  public void setStartsAt(Instant startsAt) {
    this.startsAt = startsAt;
  }

  public Instant getEndsAt() {
    return endsAt;
  }

  public void setEndsAt(Instant endsAt) {
    this.endsAt = endsAt;
  }

  public List<String> getQuestionIds() {
    return questionIds;
  }

  public void setQuestionIds(List<String> questionIds) {
    this.questionIds = questionIds;
  }

  public int getQuestionCount() {
    return questionCount;
  }

  public void setQuestionCount(int questionCount) {
    this.questionCount = questionCount;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public int getSecondsPerQuestion() {
    return secondsPerQuestion;
  }

  public void setSecondsPerQuestion(int secondsPerQuestion) {
    this.secondsPerQuestion = secondsPerQuestion;
  }

  public String getReferenceDocumentUrl() {
    return referenceDocumentUrl;
  }

  public void setReferenceDocumentUrl(String referenceDocumentUrl) {
    this.referenceDocumentUrl = referenceDocumentUrl;
  }

  public String getReferenceDocumentName() {
    return referenceDocumentName;
  }

  public void setReferenceDocumentName(String referenceDocumentName) {
    this.referenceDocumentName = referenceDocumentName;
  }
}
