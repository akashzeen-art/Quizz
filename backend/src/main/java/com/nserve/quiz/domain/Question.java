package com.nserve.quiz.domain;

import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "questions")
public class Question {

  @Id private String id;

  private String questionText;
  private String mediaUrl;
  private MediaType mediaType = MediaType.none;
  private InputType inputType = InputType.mcq4;
  private List<String> options;
  private Integer correctAnswerIndex;
  private Double correctNumeric;

  @Indexed
  private String category;

  /** Where this question maps in the quiz source document (e.g. page or section). */
  private String documentReference;

  public Question() {}

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getQuestionText() {
    return questionText;
  }

  public void setQuestionText(String questionText) {
    this.questionText = questionText;
  }

  public String getMediaUrl() {
    return mediaUrl;
  }

  public void setMediaUrl(String mediaUrl) {
    this.mediaUrl = mediaUrl;
  }

  public MediaType getMediaType() {
    return mediaType;
  }

  public void setMediaType(MediaType mediaType) {
    this.mediaType = mediaType;
  }

  public InputType getInputType() {
    return inputType;
  }

  public void setInputType(InputType inputType) {
    this.inputType = inputType;
  }

  public List<String> getOptions() {
    return options;
  }

  public void setOptions(List<String> options) {
    this.options = options;
  }

  public Integer getCorrectAnswerIndex() {
    return correctAnswerIndex;
  }

  public void setCorrectAnswerIndex(Integer correctAnswerIndex) {
    this.correctAnswerIndex = correctAnswerIndex;
  }

  public Double getCorrectNumeric() {
    return correctNumeric;
  }

  public void setCorrectNumeric(Double correctNumeric) {
    this.correctNumeric = correctNumeric;
  }

  public String getCategory() {
    return category;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public String getDocumentReference() {
    return documentReference;
  }

  public void setDocumentReference(String documentReference) {
    this.documentReference = documentReference;
  }
}
