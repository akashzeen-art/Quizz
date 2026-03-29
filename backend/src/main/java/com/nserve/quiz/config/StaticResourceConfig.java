package com.nserve.quiz.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

  private final String uploadFileLocation;

  public StaticResourceConfig(@Value("${app.upload.dir:uploads}") String uploadDir) {
    Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
    String uri = root.toUri().toString();
    this.uploadFileLocation = uri.endsWith("/") ? uri : uri + "/";
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry
        .addResourceHandler("/files/**")
        .addResourceLocations(this.uploadFileLocation);
  }
}
