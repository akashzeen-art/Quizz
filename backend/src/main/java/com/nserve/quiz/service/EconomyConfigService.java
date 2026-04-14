package com.nserve.quiz.service;

import com.nserve.quiz.domain.EconomyConfig;
import com.nserve.quiz.repo.EconomyConfigRepository;
import org.springframework.stereotype.Service;

@Service
public class EconomyConfigService {

  private final EconomyConfigRepository repo;

  public EconomyConfigService(EconomyConfigRepository repo) {
    this.repo = repo;
  }

  public EconomyConfig get() {
    return repo.findById("default").orElseGet(() -> {
      EconomyConfig cfg = new EconomyConfig();
      return repo.save(cfg);
    });
  }

  public EconomyConfig update(EconomyConfig incoming) {
    incoming.setId("default");
    return repo.save(incoming);
  }
}
