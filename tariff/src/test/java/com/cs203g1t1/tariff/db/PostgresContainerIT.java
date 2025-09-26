// src/test/java/com/cs203g1t1/tariff/db/PostgresContainersIT.java
package com.cs203g1t1.tariff.db;

import com.cs203g1t1.tariff.repository.TariffRepository;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class PostgresContainersIT {
    
  @MockBean
  com.cs203g1t1.tariff.service.TariffService tariffService;

  @MockBean
  com.cs203g1t1.tariff.client.CountryClient countryClient;

  @MockBean
  com.cs203g1t1.tariff.client.ProductClient productClient;

  @Container
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:16")
          .withDatabaseName("tariff")
          .withUsername("tariff")
          .withPassword("tariff");

  @DynamicPropertySource
  static void registerProps(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add("spring.datasource.username", POSTGRES::getUsername);
    registry.add("spring.datasource.password", POSTGRES::getPassword);
    registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    registry.add("spring.flyway.enabled", () -> "true");
    registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
  }

  @BeforeAll
  static void skipIfNoDocker() {
    Assumptions.assumeTrue(
        DockerClientFactory.instance().isDockerAvailable(),
        "Docker not available — skipping container IT.");
  }

  @Autowired
  TariffRepository repo;

  @Test
  void flywayMigrationsRun_andFinderWorks() {
    LocalDate today = LocalDate.now();

    var found = repo.findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
        "85171300", "SG", "CN", today, today);

    assertThat(found).isPresent();
  }
}
