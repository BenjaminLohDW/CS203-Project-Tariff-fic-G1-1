// src/test/java/com/cs203g1t1/tariff/service/TariffServiceIT.java
package com.cs203g1t1.tariff.service;

import com.cs203g1t1.tariff.repository.TariffRepository;
import com.cs203g1t1.tariff.dto.TariffResponse;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TariffServiceIT {

  // Real Postgres via Testcontainers
  @Container
  @SuppressWarnings("resource")
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16")
          .withDatabaseName("tariff")
          .withUsername("tariff")
          .withPassword("tariff");

  // Point Spring to the container DB; let Flyway run
  @DynamicPropertySource
  static void props(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    r.add("spring.datasource.username", POSTGRES::getUsername);
    r.add("spring.datasource.password", POSTGRES::getPassword);
    r.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    r.add("spring.flyway.enabled", () -> "true");
    r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");

    // keep external clients inert (they’re mocked below)
    r.add("country.base-url", () -> "http://localhost:65535");
    r.add("product.base-url", () -> "http://localhost:65535");
  }

  @BeforeAll
  static void skipIfNoDocker() {
    Assumptions.assumeTrue(
        DockerClientFactory.instance().isDockerAvailable(),
        "Docker not available — skipping container IT."
    );
  }

  // Mock external microservices so the service can wire without real network calls
  @MockBean com.cs203g1t1.tariff.controller.TariffController tariffController; // not used, but harmless
  @MockBean com.cs203g1t1.tariff.client.CountryClient countryClient;
  @MockBean com.cs203g1t1.tariff.client.ProductClient productClient;

  @Autowired TariffRepository repo;          // optional: sanity checks
  @Autowired TariffService tariffService;    // real service bean under test

  @Test
  void getOneEffectiveByNames_happyPath_returnsResponse() {
    // Example: seed has rule active today for hs=85171300, importer=SG, exporter=CN
    when(productClient.getHsCodeByProductName("smartphone")).thenReturn("85171300");
    when(countryClient.getCountryIdByName("Singapore")).thenReturn("SG");
    when(countryClient.getCountryIdByName("China")).thenReturn("CN");

    LocalDate today = LocalDate.now();

    TariffResponse resp = tariffService.getOneEffectiveByNames(
        "smartphone", "Singapore", "China", today);

    assertThat(resp).as("TariffResponse should not be null").isNotNull();
    // Optional stronger checks if your mapper exposes these:
    // assertThat(resp.getHsCode()).isEqualTo("85171300");
    // assertThat(resp.getImporterId()).isEqualTo("SG");
    // assertThat(resp.getExporterId()).isEqualTo("CN");
  }

  @Test
  void listAll_returnsAtLeastOne_afterSeed() {
    var all = tariffService.listAll();
    assertThat(all).isNotNull();
    assertThat(all.size()).isGreaterThanOrEqualTo(1);
  }
}
