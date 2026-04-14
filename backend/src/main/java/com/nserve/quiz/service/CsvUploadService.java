package com.nserve.quiz.service;

import com.nserve.quiz.domain.InputType;
import com.nserve.quiz.domain.MediaType;
import com.nserve.quiz.domain.Question;
import com.nserve.quiz.domain.Quiz;
import com.nserve.quiz.domain.QuizStatus;
import com.nserve.quiz.dto.CsvUploadResult;
import com.nserve.quiz.dto.PdfQuizUploadResultDto;
import com.nserve.quiz.repo.QuestionRepository;
import com.nserve.quiz.repo.QuizRepository;
import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CsvUploadService {

  private static final int QUESTIONS_PER_SET = 10;

  private final QuestionRepository questionRepository;
  private final QuizRepository quizRepository;

  public CsvUploadService(QuestionRepository questionRepository, QuizRepository quizRepository) {
    this.questionRepository = questionRepository;
    this.quizRepository = quizRepository;
  }

  public CsvUploadResult process(
      MultipartFile file, String category, String titlePrefix, int releaseSetNumber)
      throws IOException {
    List<String[]> rows = parseRows(file);
    List<String> errors = new ArrayList<>();
    List<String> savedIds = new ArrayList<>();

    for (int i = 0; i < rows.size(); i++) {
      int rowNum = i + 2;
      String[] r = rows.get(i);
      if (r.length < 8) {
        errors.add("Row " + rowNum + ": expected 8 columns, got " + r.length);
        continue;
      }
      try {
        Question q = toQuestion(r, category);
        questionRepository.save(q);
        savedIds.add(q.getId());
      } catch (Exception e) {
        errors.add("Row " + rowNum + ": " + e.getMessage());
      }
    }

    int setsCreated = createQuizSets(savedIds, category, titlePrefix, releaseSetNumber);
    int clampedRelease = savedIds.isEmpty() ? 0 : Math.min(releaseSetNumber, setsCreated);
    return new CsvUploadResult(savedIds.size(), setsCreated, clampedRelease, errors);
  }

  /** Strict structured CSV mode: TITLE is mandatory and each TITLE must have exactly 10 questions. */
  public PdfQuizUploadResultDto parseStructuredAndOptionallySave(
      MultipartFile file, String defaultCategory, boolean saveAsDraft) throws IOException {
    List<String[]> rows = parseRows(file);
    List<String> errors = new ArrayList<>();
    List<StructuredSet> sets = parseStructuredSets(rows, errors);
    if (!errors.isEmpty()) {
      int show = Math.min(errors.size(), 12);
      throw new IllegalArgumentException(
          "Invalid CSV format:\n- " + String.join("\n- ", errors.subList(0, show)));
    }
    if (sets.isEmpty()) {
      throw new IllegalArgumentException("No valid quiz sets found in CSV");
    }
    if (saveAsDraft) {
      persistStructuredSets(sets, defaultCategory);
    }
    int total = sets.stream().mapToInt(s -> s.questions.size()).sum();
    List<PdfQuizUploadResultDto.PdfQuizSetDto> previews =
        sets.stream()
            .map(
                s ->
                    new PdfQuizUploadResultDto.PdfQuizSetDto(
                        s.title,
                        s.questions.size(),
                        s.questions.stream().limit(3).map(q -> q.getQuestionText()).toList()))
            .toList();
    return new PdfQuizUploadResultDto(total, sets.size(), saveAsDraft, previews, List.of());
  }

  private List<StructuredSet> parseStructuredSets(List<String[]> rows, List<String> errors) {
    List<StructuredSet> sets = new ArrayList<>();
    StructuredSet current = null;
    int lineNo = 1;
    for (String[] r : rows) {
      lineNo++;
      if (r.length == 0) continue;
      String type = col(r, 0).trim();
      if (type.isBlank()) continue;
      if ("TITLE".equalsIgnoreCase(type)) {
        if (current != null && current.questions.size() != QUESTIONS_PER_SET) {
          errors.add(
              "TITLE \"" + current.title + "\" must have exactly " + QUESTIONS_PER_SET
                  + " questions, found " + current.questions.size());
        }
        String title = col(r, 1).trim();
        if (title.isBlank()) {
          errors.add("Line " + lineNo + ": TITLE row missing quiz name");
          current = null;
          continue;
        }
        current = new StructuredSet(title);
        sets.add(current);
        continue;
      }
      if (current == null) {
        errors.add("Line " + lineNo + ": question row found before first TITLE");
        continue;
      }
      if (r.length < 8) {
        errors.add("Line " + lineNo + ": expected 8 columns");
        continue;
      }
      if (current.questions.size() >= QUESTIONS_PER_SET) {
        errors.add(
            "Line " + lineNo + ": TITLE \"" + current.title + "\" has more than "
                + QUESTIONS_PER_SET + " questions");
        continue;
      }
      try {
        Question q = toQuestion(r, "general");
        // For strict binary format keep option slots stable (A/B + empty C/D)
        if (q.getInputType() == InputType.binary && q.getOptions().size() == 2) {
          q.setOptions(Arrays.asList(q.getOptions().get(0), q.getOptions().get(1), "", ""));
        }
        current.questions.add(q);
      } catch (Exception ex) {
        errors.add("Line " + lineNo + ": " + ex.getMessage());
      }
    }
    if (sets.isEmpty()) {
      errors.add("TITLE row is mandatory for each quiz set");
      return List.of();
    }
    if (current != null && current.questions.size() != QUESTIONS_PER_SET) {
      errors.add(
          "TITLE \"" + current.title + "\" must have exactly " + QUESTIONS_PER_SET
              + " questions, found " + current.questions.size());
    }
    return sets;
  }

  private void persistStructuredSets(List<StructuredSet> sets, String defaultCategory) {
    String category =
        defaultCategory != null && !defaultCategory.isBlank()
            ? defaultCategory.trim().toLowerCase(Locale.ROOT)
            : "general";
    for (StructuredSet set : sets) {
      List<String> qids = new ArrayList<>();
      for (Question q : set.questions) {
        q.setCategory(category);
        questionRepository.save(q);
        qids.add(q.getId());
      }
      Quiz quiz = new Quiz();
      quiz.setTitle(set.title);
      quiz.setDescription("CSV imported draft");
      quiz.setStatus(QuizStatus.draft);
      quiz.setCategory(category);
      quiz.setSecondsPerQuestion(15);
      quiz.setQuestionIds(qids);
      quiz.setQuestionCount(qids.size());
      quiz.setCreatedAt(Instant.now());
      quizRepository.save(quiz);
    }
  }

  // ── parsing ──────────────────────────────────────────────────────────────

  private List<String[]> parseRows(MultipartFile file) throws IOException {
    try (CSVReader reader = new CSVReader(
        new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
      List<String[]> all = reader.readAll();
      // drop header row if present
      if (!all.isEmpty() && isHeader(all.get(0))) {
        all.remove(0);
      }
      return all;
    } catch (CsvException e) {
      throw new IOException("CSV parse error: " + e.getMessage(), e);
    }
  }

  private boolean isHeader(String[] row) {
    if (row.length == 0) return false;
    String first = row[0].trim().toLowerCase();
    return first.contains("question type") || first.contains("type");
  }

  private Question toQuestion(String[] r, String defaultCategory) {
    String typeRaw   = col(r, 0);
    String text      = col(r, 1);
    String correct   = col(r, 2);
    String asset     = col(r, 3);
    String optA      = col(r, 4);
    String optB      = col(r, 5);
    String optC      = col(r, 6);
    String optD      = col(r, 7);

    if (text.isBlank()) throw new IllegalArgumentException("Question text is empty");
    if (correct.isBlank()) throw new IllegalArgumentException("Correct answer is empty");

    InputType inputType = mapInputType(typeRaw);
    MediaType mediaType = resolveMediaType(typeRaw, asset);

    List<String> options = buildOptions(inputType, optA, optB, optC, optD);

    Question q = new Question();
    q.setQuestionText(text.trim());
    q.setInputType(inputType);
    q.setMediaType(mediaType);
    q.setOptions(options);
    if (inputType == InputType.slider) {
      try {
        q.setCorrectNumeric(Double.parseDouble(correct.trim()));
      } catch (NumberFormatException ex) {
        throw new IllegalArgumentException("SLIDER correct answer must be numeric");
      }
      q.setCorrectAnswerIndex(null);
    } else {
      int correctIndex = resolveCorrectIndex(correct, options);
      q.setCorrectAnswerIndex(correctIndex);
      q.setCorrectNumeric(null);
    }
    q.setCategory(defaultCategory != null && !defaultCategory.isBlank()
        ? defaultCategory.trim().toLowerCase() : "general");

    if (!isNull(asset)) {
      q.setMediaUrl(asset.trim());
    }
    return q;
  }

  // ── type mapping ─────────────────────────────────────────────────────────

  private InputType mapInputType(String raw) {
    String t = raw.trim().toUpperCase();
    if (t.equals("BINARY")) return InputType.binary;
    if (t.equals("SLIDER")) return InputType.slider;
    // Treat these as MCQ4 (media type comes from type/asset)
    if (t.equals("TEXT MCQ")
        || t.equals("IMAGE MCQ")
        || t.equals("AUDIO MCQ")
        || t.equals("GIF MCQ")
        || t.equals("VIDEO MCQ")
        || t.equals("GIF")
        || t.equals("IMAGE")
        || t.equals("VIDEO")
        || t.equals("AUDIO")) {
      return InputType.mcq4;
    }
    throw new IllegalArgumentException("Unknown question type: " + raw);
  }

  private MediaType resolveMediaType(String typeRaw, String asset) {
    // explicit type from column name takes priority
    String t = typeRaw.trim().toUpperCase();
    if (t.startsWith("IMAGE")) return MediaType.image;
    if (t.startsWith("AUDIO")) return MediaType.audio;
    if (t.startsWith("GIF"))   return MediaType.gif;
    if (t.startsWith("VIDEO")) return MediaType.video;

    // fall back to asset URL extension
    if (!isNull(asset)) {
      String lower = asset.trim().toLowerCase();
      if (lower.endsWith(".gif"))              return MediaType.gif;
      if (lower.endsWith(".mp4"))              return MediaType.video;
      if (lower.endsWith(".mp3") || lower.endsWith(".wav")) return MediaType.audio;
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          || lower.endsWith(".png") || lower.endsWith(".webp")) return MediaType.image;
    }
    return MediaType.none;
  }

  // ── options & correct index ───────────────────────────────────────────────

  private List<String> buildOptions(InputType type, String a, String b, String c, String d) {
    if (type == InputType.binary) {
      if (a.isBlank() || b.isBlank())
        throw new IllegalArgumentException("BINARY requires Option A and Option B");
      return Arrays.asList(a.trim(), b.trim(), "", "");
    }
    if (type == InputType.slider) {
      // Use Option A/B as min/max when provided; default to 0–100 if empty.
      String min = isNull(a) ? "0" : a.trim();
      String max = isNull(b) ? "100" : b.trim();
      return Arrays.asList(min, max, "", "");
    }
    // mcq4 — replace NULL with empty string
    return Arrays.asList(
        isNull(a) ? "" : a.trim(),
        isNull(b) ? "" : b.trim(),
        isNull(c) ? "" : c.trim(),
        isNull(d) ? "" : d.trim()
    );
  }

  private int resolveCorrectIndex(String correct, List<String> options) {
    String c = correct.trim();
    for (int i = 0; i < options.size(); i++) {
      if (options.get(i).equalsIgnoreCase(c)) return i;
      if (normalizeAnswer(options.get(i)).equals(normalizeAnswer(c))) return i;
      if (normalizeAnswerLoosePlural(options.get(i)).equals(normalizeAnswerLoosePlural(c)))
        return i;
    }
    // try numeric index (0-based or 1-based)
    try {
      int idx = Integer.parseInt(c);
      // if user wrote 1-based (1–4) convert to 0-based
      if (idx >= 1 && idx <= options.size()) return idx - 1;
      if (idx >= 0 && idx < options.size())  return idx;
    } catch (NumberFormatException ignored) {}
    throw new IllegalArgumentException(
        "Correct answer \"" + correct + "\" does not match any option: " + options);
  }

  private static String normalizeAnswer(String s) {
    if (s == null) return "";
    return s.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
  }

  private static String normalizeAnswerLoosePlural(String s) {
    String n = normalizeAnswer(s);
    if (n.endsWith("s") && n.length() > 3) return n.substring(0, n.length() - 1);
    return n;
  }

  // ── quiz set generation ───────────────────────────────────────────────────

  private int createQuizSets(
      List<String> ids, String category, String titlePrefix, int releaseSetNumber) {
    if (ids.isEmpty()) return 0;
    String prefix = (titlePrefix != null && !titlePrefix.isBlank())
        ? titlePrefix.trim() : "Quiz Set";
    int setNumber = 1;
    for (int start = 0; start < ids.size(); start += QUESTIONS_PER_SET) {
      List<String> chunk = ids.subList(start, Math.min(start + QUESTIONS_PER_SET, ids.size()));
      Quiz quiz = new Quiz();
      quiz.setTitle(prefix + " " + setNumber);
      quiz.setDescription("CSV bulk upload — set " + setNumber);
      quiz.setCategory(category != null && !category.isBlank()
          ? category.trim().toLowerCase() : "general");
      quiz.setStatus(setNumber == releaseSetNumber ? QuizStatus.live : QuizStatus.upcoming);
      quiz.setSecondsPerQuestion(15);
      quiz.setQuestionIds(new ArrayList<>(chunk));
      quiz.setQuestionCount(chunk.size());
      quiz.setCreatedAt(Instant.now());
      quizRepository.save(quiz);
      setNumber++;
    }
    return setNumber - 1;
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private String col(String[] row, int idx) {
    if (idx >= row.length) return "";
    String v = row[idx].trim();
    return isNull(v) ? "" : v;
  }

  private boolean isNull(String v) {
    return v == null || v.isBlank() || v.equalsIgnoreCase("NULL") || v.equalsIgnoreCase("N/A");
  }

  private static class StructuredSet {
    final String title;
    final List<Question> questions = new ArrayList<>();

    StructuredSet(String title) {
      this.title = title;
    }
  }
}
