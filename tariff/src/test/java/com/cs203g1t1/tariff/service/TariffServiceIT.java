// src/test/java/com/cs203g1t1/tariff/service/TariffServiceIT.java
package com.cs203g1t1.tariff.service;

import com.cs203g1t1.tariff.repository.TariffRepository;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.dto.EffectiveByNamesRequest;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TariffServiceIT {
  // Real Postgres via Testcontainers
  @Container
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

    // keep external clients inert
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

  // Mock external microservices so service can wire but won’t call the network
  @MockBean com.cs203g1t1.tariff.controller.TariffController tariffController;
  @MockBean com.cs203g1t1.tariff.client.CountryClient countryClient;
  @MockBean com.cs203g1t1.tariff.client.ProductClient productClient;

  @Autowired TariffRepository repo;          // used only for sanity checks if needed
  @Autowired TariffService tariffService;    // your real service bean

  @Test
  void getOneEffectiveByNames_happyPath_returnsResponse() {
    // Seed in Phase 7 used: hs=85171300, importer=702, exporter=156, active today
    when(productClient.getHsCodeByProductName("smartphone")).thenReturn("85171300");
    when(countryClient.getCountryIdByName("Singapore")).thenReturn("SG");
    when(countryClient.getCountryIdByName("China")).thenReturn("CN");

    LocalDate today = LocalDate.now();
    EffectiveByNamesRequest req = new EffectiveByNamesRequest();
    req.setProductName("smartphone");
    req.setImporterCountryName("Singapore");
    req.setExporterCountryName("China");
    req.setDate(today);

    TariffResponse resp = tariffService.getOneEffectiveByNames(req);

    assertThat(resp).as("TariffResponse should not be null").isNotNull();
    // Optional stronger checks if your DTO exposes these fields:
    // assertThat(resp.getHsCode()).isEqualTo("85171300");
    // assertThat(resp.getImporterId()).isEqualTo(702L);
    // assertThat(resp.getExporterId()).isEqualTo(156L);
  }

  @Test
  void listAll_returnsAtLeastOne_afterSeed() {
    var all = tariffService.listAll();
    assertThat(all).isNotNull();
    assertThat(all.size()).isGreaterThanOrEqualTo(1);
  }
}