package com.cs203g1t1.tariff.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class HttpClientsConfig {

  @Bean
  public RestTemplate restTemplate(RestTemplateBuilder b) {
    return b
        .setConnectTimeout(Duration.ofSeconds(2_000))
        .setReadTimeout(Duration.ofSeconds(15_000))
        .build();
  }
}
