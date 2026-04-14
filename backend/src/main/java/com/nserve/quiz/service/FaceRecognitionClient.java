package com.nserve.quiz.service;

import com.nserve.quiz.dto.FaceEncodeResponse;
import com.nserve.quiz.dto.FaceMatchRequest;
import com.nserve.quiz.dto.FaceMatchResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
public class FaceRecognitionClient {

  private final WebClient client;

  public FaceRecognitionClient(@Value("${app.face.service-url:http://localhost:8001}") String baseUrl) {
    this.client =
        WebClient.builder()
            .baseUrl(baseUrl)
            .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024))
            .build();
  }

  public FaceEncodeResponse encode(byte[] imageBytes) {
    MultipartBodyBuilder b = new MultipartBodyBuilder();
    b.part("image", imageBytes).filename("face.jpg").contentType(MediaType.IMAGE_JPEG);
    MultiValueMap<String, org.springframework.http.HttpEntity<?>> parts = b.build();
    try {
      return client
          .post()
          .uri("/encode-face")
          .contentType(MediaType.MULTIPART_FORM_DATA)
          .body(BodyInserters.fromMultipartData(parts))
          .retrieve()
          .bodyToMono(FaceEncodeResponse.class)
          .timeout(Duration.ofSeconds(20))
          .block();
    } catch (WebClientResponseException e) {
      String msg = e.getResponseBodyAsString();
      throw new IllegalArgumentException(
          "Face service error (" + e.getStatusCode().value() + "): "
              + (msg == null || msg.isBlank() ? e.getMessage() : msg));
    } catch (Exception e) {
      throw new IllegalArgumentException("Cannot reach face service. Is it running on port 8001?");
    }
  }

  public FaceMatchResponse match(byte[] imageBytes, FaceMatchRequest req) {
    MultipartBodyBuilder b = new MultipartBodyBuilder();
    b.part("image", imageBytes).filename("face.jpg").contentType(MediaType.IMAGE_JPEG);
    b.part("candidates", req).contentType(MediaType.APPLICATION_JSON);
    MultiValueMap<String, org.springframework.http.HttpEntity<?>> parts = b.build();
    try {
      return client
          .post()
          .uri("/match-face")
          .contentType(MediaType.MULTIPART_FORM_DATA)
          .body(BodyInserters.fromMultipartData(parts))
          .retrieve()
          .bodyToMono(FaceMatchResponse.class)
          .timeout(Duration.ofSeconds(25))
          .block();
    } catch (WebClientResponseException e) {
      String msg = e.getResponseBodyAsString();
      throw new IllegalArgumentException(
          "Face service error (" + e.getStatusCode().value() + "): " + (msg == null || msg.isBlank() ? e.getMessage() : msg));
    } catch (Exception e) {
      throw new IllegalArgumentException("Cannot reach face service. Is it running on port 8001?");
    }
  }
}

