package com.nserve.quiz.api;

import com.nserve.quiz.dto.FaceEncodeResponse;
import com.nserve.quiz.service.FaceRecognitionClient;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/face")
public class FaceEncodeController {

  private final FaceRecognitionClient faceClient;

  public FaceEncodeController(FaceRecognitionClient faceClient) {
    this.faceClient = faceClient;
  }

  /** Public endpoint for signup flow: returns the 128-d encoding; does not store it. */
  @PostMapping(value = "/encode", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public FaceEncodeResponse encode(@RequestPart("image") MultipartFile image) throws IOException {
    if (image == null || image.isEmpty()) throw new IllegalArgumentException("Image is required");
    FaceEncodeResponse res = faceClient.encode(image.getBytes());
    if (res == null || res.encoding() == null || res.encoding().isEmpty()) {
      throw new IllegalArgumentException("No face detected. Try again.");
    }
    return res;
  }
}

