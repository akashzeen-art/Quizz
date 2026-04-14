package com.nserve.quiz.service;

import com.nserve.quiz.domain.InputType;
import com.nserve.quiz.domain.MediaType;
import com.nserve.quiz.domain.Question;
import com.nserve.quiz.domain.Quiz;
import com.nserve.quiz.domain.QuizStatus;
import com.nserve.quiz.dto.PdfQuizUploadResultDto;
import com.nserve.quiz.repo.QuestionRepository;
import com.nserve.quiz.repo.QuizRepository;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PdfQuizUploadService {

  private static final int QUESTIONS_PER_SET = 10;

  private final QuestionRepository questionRepository;
  private final QuizRepository quizRepository;

  public PdfQuizUploadService(QuestionRepository questionRepository, QuizRepository quizRepository) {
    this.questionRepository = questionRepository;
    this.quizRepository = quizRepository;
  }

  public PdfQuizUploadResultDto parseAndOptionallySave(
      MultipartFile file, String defaultCategory, boolean saveAsDraft) throws IOException {
    String text = extractText(file);
    List<String> errors = new ArrayList<>();
    List<ParsedGroup> groups = parseIntoGroups(text, errors);
    if (!errors.isEmpty()) {
      int show = Math.min(errors.size(), 12);
      throw new IllegalArgumentException(
          "Invalid PDF format:\n- " + String.join("\n- ", errors.subList(0, show)));
    }
    if (groups.isEmpty()) {
      throw new IllegalArgumentException("No valid quiz sets found in PDF");
    }
    List<PdfQuizUploadResultDto.PdfQuizSetDto> previewSets = new ArrayList<>();
    int totalQuestions = 0;
    for (ParsedGroup g : groups) {
      totalQuestions += g.questions.size();
      List<String> samples = g.questions.stream().limit(3).map(q -> q.questionText).toList();
      previewSets.add(new PdfQuizUploadResultDto.PdfQuizSetDto(g.title, g.questions.size(), samples));
    }
    if (saveAsDraft) {
      persistDrafts(groups, defaultCategory);
    }
    return new PdfQuizUploadResultDto(
        totalQuestions, groups.size(), saveAsDraft, previewSets, errors);
  }

  private String extractText(MultipartFile file) throws IOException {
    try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
      PDFTextStripper stripper = new PDFTextStripper();
      return stripper.getText(doc);
    } catch (IOException ex) {
      throw new IllegalArgumentException(
          "Invalid or unreadable PDF. Re-export the file as a standard PDF and try again.");
    }
  }

  private List<ParsedGroup> parseIntoGroups(String text, List<String> errors) {
    String[] lines = text.split("\\R");
    List<ParsedGroup> groups = new ArrayList<>();
    ParsedGroup current = null;
    boolean sawAnyTitle = false;
    Set<String> dedupe = new HashSet<>();
    for (int i = 0; i < lines.length; i++) {
      String line = lines[i].trim();
      if (line.isBlank()) continue;
      if (isHeader(line)) continue;
      List<String> cols = splitRow(line);
      if (isTitleColumns(cols, line)) {
        sawAnyTitle = true;
        if (current != null && current.questions.size() != QUESTIONS_PER_SET) {
          errors.add(
              "TITLE \"" + current.title + "\" must have exactly " + QUESTIONS_PER_SET
                  + " questions, found " + current.questions.size());
        }
        String title = extractTitle(cols, line);
        if (title.isBlank()) {
          errors.add("Line " + (i + 1) + ": TITLE is missing quiz name");
          continue;
        }
        current = new ParsedGroup(title);
        groups.add(current);
        continue;
      }
      if (cols.size() < 8) {
        errors.add("Line " + (i + 1) + ": expected 8 columns, got " + cols.size());
        continue;
      }
      if (!sawAnyTitle || current == null) {
        errors.add("Line " + (i + 1) + ": question row found before first TITLE");
        continue;
      }
      try {
        PendingQuestion pq = toPendingQuestion(cols);
        String key = pq.questionText.toLowerCase(Locale.ROOT);
        if (!dedupe.add(key)) {
          errors.add("Line " + (i + 1) + ": duplicate question text");
          continue;
        }
        if (current.questions.size() >= QUESTIONS_PER_SET) {
          errors.add(
              "Line " + (i + 1) + ": TITLE \"" + current.title + "\" has more than "
                  + QUESTIONS_PER_SET + " questions");
          continue;
        }
        current.questions.add(pq);
      } catch (Exception ex) {
        errors.add("Line " + (i + 1) + ": " + ex.getMessage());
      }
    }
    if (!sawAnyTitle) {
      errors.add("TITLE row is mandatory for each quiz set");
      return List.of();
    }
    if (current != null && current.questions.size() != QUESTIONS_PER_SET) {
      errors.add(
          "TITLE \"" + current.title + "\" must have exactly " + QUESTIONS_PER_SET
              + " questions, found " + current.questions.size());
    }
    return groups;
  }

  private void persistDrafts(List<ParsedGroup> groups, String defaultCategory) {
    String category =
        defaultCategory != null && !defaultCategory.isBlank()
            ? defaultCategory.trim().toLowerCase(Locale.ROOT)
            : "general";
    for (ParsedGroup g : groups) {
      List<String> qids = new ArrayList<>();
      for (PendingQuestion pq : g.questions) {
        Question q = new Question();
        q.setQuestionText(pq.questionText);
        q.setInputType(pq.inputType);
        q.setMediaType(pq.mediaType);
        q.setMediaUrl(pq.mediaUrl);
        q.setOptions(pq.options);
        q.setCorrectAnswerIndex(pq.correctAnswerIndex);
        q.setCategory(category);
        questionRepository.save(q);
        qids.add(q.getId());
      }
      Quiz quiz = new Quiz();
      quiz.setTitle(g.title);
      quiz.setDescription("PDF imported draft");
      quiz.setStatus(QuizStatus.draft);
      quiz.setCategory(category);
      quiz.setSecondsPerQuestion(15);
      quiz.setQuestionIds(qids);
      quiz.setQuestionCount(qids.size());
      quiz.setCreatedAt(Instant.now());
      quizRepository.save(quiz);
    }
  }

  private PendingQuestion toPendingQuestion(List<String> cols) {
    String type = cols.get(0).trim();
    String questionText = cols.get(1).trim();
    String correct = cols.get(2).trim();
    String asset = cols.get(3).trim();
    String a = val(cols, 4);
    String b = val(cols, 5);
    String c = val(cols, 6);
    String d = val(cols, 7);
    if (questionText.isBlank()) throw new IllegalArgumentException("Question text is empty");
    InputType inputType = mapInputType(type);
    List<String> options = buildOptions(inputType, a, b, c, d);
    int correctIdx = resolveCorrectIndex(correct, options);
    PendingQuestion out = new PendingQuestion();
    out.questionText = questionText;
    out.inputType = inputType;
    out.options = options;
    out.correctAnswerIndex = correctIdx;
    out.mediaUrl = isNull(asset) ? null : asset;
    out.mediaType = resolveMediaType(type, asset);
    return out;
  }

  private InputType mapInputType(String raw) {
    String t = raw.trim().toUpperCase(Locale.ROOT);
    if (t.contains("BINARY")) return InputType.binary;
    if (t.contains("MCQ3")) return InputType.mcq3;
    if (t.contains("SLIDER")) return InputType.slider;
    return InputType.mcq4;
  }

  private List<String> buildOptions(InputType type, String a, String b, String c, String d) {
    if (type == InputType.binary) {
      if (a.isBlank() || b.isBlank()) throw new IllegalArgumentException("Binary needs options A and B");
      return List.of(a, b, "", "");
    }
    if (type == InputType.mcq3) {
      if (a.isBlank() || b.isBlank() || c.isBlank()) {
        throw new IllegalArgumentException("MCQ3 needs options A, B, C");
      }
      return List.of(a, b, c);
    }
    if (type == InputType.slider) {
      String min = a.isBlank() ? "0" : a;
      String max = b.isBlank() ? "100" : b;
      return List.of(min, max);
    }
    return List.of(a, b, c, d);
  }

  private int resolveCorrectIndex(String correct, List<String> options) {
    for (int i = 0; i < options.size(); i++) {
      if (options.get(i).equalsIgnoreCase(correct)) return i;
    }
    try {
      int idx = Integer.parseInt(correct.trim());
      if (idx >= 1 && idx <= options.size()) return idx - 1;
      if (idx >= 0 && idx < options.size()) return idx;
    } catch (NumberFormatException ignored) {
      // handled below
    }
    throw new IllegalArgumentException("Correct answer not present in options");
  }

  private MediaType resolveMediaType(String type, String asset) {
    String t = type.trim().toUpperCase(Locale.ROOT);
    if (t.startsWith("GIF")) return MediaType.gif;
    if (t.startsWith("IMAGE")) return MediaType.image;
    if (t.startsWith("VIDEO")) return MediaType.video;
    if (t.startsWith("AUDIO")) return MediaType.audio;
    if (isNull(asset)) return MediaType.none;
    String lower = asset.toLowerCase(Locale.ROOT);
    if (lower.endsWith(".gif")) return MediaType.gif;
    if (lower.endsWith(".mp4") || lower.endsWith(".webm")) return MediaType.video;
    if (lower.endsWith(".mp3") || lower.endsWith(".wav")) return MediaType.audio;
    if (lower.endsWith(".jpg")
        || lower.endsWith(".jpeg")
        || lower.endsWith(".png")
        || lower.endsWith(".webp")) return MediaType.image;
    return MediaType.none;
  }

  private List<String> splitRow(String line) {
    // Accept table-like rows from PDFs:
    // 1) tab-separated columns
    // 2) pipe-separated columns
    // 3) comma-separated columns
    // 4) multi-space separated columns
    // 5) header-style plain spaces with known type prefix
    if (line.contains("|")) {
      String[] parts = line.split("\\s*\\|\\s*");
      List<String> out = new ArrayList<>();
      for (String p : parts) out.add(p.trim());
      return out;
    }
    if (line.contains("\t")) {
      String[] parts = line.split("\t");
      List<String> out = new ArrayList<>();
      for (String p : parts) out.add(p.trim());
      return out;
    }
    String[] parts = line.split("\\s*,\\s*");
    if (parts.length >= 8) {
      List<String> out = new ArrayList<>();
      for (String p : parts) out.add(p.trim());
      return out;
    }
    String[] spaced = line.trim().split("\\s{2,}");
    if (spaced.length >= 8) {
      List<String> out = new ArrayList<>();
      for (String p : spaced) out.add(p.trim());
      return out;
    }
    return splitByKnownTypePrefix(line);
  }

  /**
   * Fallback parser for plain-space lines where the first token is one of known question types.
   * This expects columns to be separated by at least some visible spacing in extracted PDF text.
   */
  private List<String> splitByKnownTypePrefix(String line) {
    String raw = line.trim();
    String upper = raw.toUpperCase(Locale.ROOT);
    String[] types = {"IMAGE MCQ", "TEXT MCQ", "VIDEO MCQ", "AUDIO MCQ", "BINARY", "GIF", "SLIDER", "TITLE"};
    String picked = null;
    for (String t : types) {
      if (upper.startsWith(t)) {
        picked = t;
        break;
      }
    }
    if (picked == null) return List.of(raw);
    if ("TITLE".equals(picked)) {
      String title = parseTitle(raw);
      return List.of("TITLE", title, "", "", "", "", "", "");
    }
    String rest = raw.substring(picked.length()).trim();
    String[] fields = rest.split("\\s{2,}");
    List<String> cols = new ArrayList<>();
    cols.add(picked);
    for (String f : fields) cols.add(f.trim());
    while (cols.size() < 8) cols.add("");
    if (cols.size() > 8) {
      // Merge extra tails into Option D to avoid dropping content.
      StringBuilder tail = new StringBuilder(cols.get(7));
      for (int i = 8; i < cols.size(); i++) {
        if (!cols.get(i).isBlank()) {
          if (tail.length() > 0) tail.append(' ');
          tail.append(cols.get(i));
        }
      }
      while (cols.size() > 8) cols.remove(cols.size() - 1);
      cols.set(7, tail.toString());
    }
    return cols;
  }

  private boolean isHeader(String line) {
    String l = line.toLowerCase(Locale.ROOT);
    return l.contains("question type")
        && l.contains("question text")
        && l.contains("correct answer");
  }

  private boolean isTitleRow(String line) {
    String l = line.toUpperCase(Locale.ROOT);
    return l.startsWith("TITLE|")
        || l.startsWith("TITLE,")
        || l.startsWith("TITLE:")
        || l.equals("TITLE");
  }

  private boolean isTitleColumns(List<String> cols, String line) {
    if (!cols.isEmpty() && "TITLE".equalsIgnoreCase(cols.get(0).trim())) return true;
    return isTitleRow(line);
  }

  private String extractTitle(List<String> cols, String line) {
    if (cols.size() > 1 && !isNull(cols.get(1))) return cols.get(1).trim();
    return parseTitle(line);
  }

  private String parseTitle(String line) {
    String t = line.replaceFirst("(?i)^TITLE\\s*[:|,]?\\s*", "").trim();
    return t.isBlank() ? "Quiz Set" : t;
  }

  private String val(List<String> cols, int idx) {
    if (idx >= cols.size()) return "";
    String v = cols.get(idx).trim();
    return isNull(v) ? "" : v;
  }

  private boolean isNull(String v) {
    return v == null || v.isBlank() || "NULL".equalsIgnoreCase(v) || "N/A".equalsIgnoreCase(v);
  }

  private static class PendingQuestion {
    String questionText;
    InputType inputType;
    MediaType mediaType;
    String mediaUrl;
    List<String> options;
    int correctAnswerIndex;
  }

  private static class ParsedGroup {
    final String title;
    final List<PendingQuestion> questions = new ArrayList<>();

    ParsedGroup(String title) {
      this.title = title;
    }
  }
}
