package com.cs203g1t1.tariff.repository;

import com.cs203g1t1.tariff.domain.Tariff;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("local") // use application-local.properties (H2 + validate)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
class TariffRepositoryTest {

  @Autowired TariffRepository repo;

  @Test
  void saveAndRead() {
    Tariff t = Tariff.builder()
        .hsCode("010121")
        .importerId("SG")
        .exporterId("CN")
        .tariffType("Ad Valorem")
        .tariffRate(5.0)
        .minTariffAmt(1.0)         
        .maxTariffAmt(9999.99)     
        .startDate(LocalDate.of(2025, 1, 1))
        .endDate(LocalDate.of(2025, 12, 31))
        .build();

    Tariff saved = repo.save(t);
    assertThat(saved.getId()).isNotNull();
    assertThat(repo.findById(saved.getId())).isPresent();
  }

  @Test
  void finder_effectiveOnDate_returnsRecord() {
    // seed
    Tariff t = Tariff.builder()
        .hsCode("010121")
        .importerId("SG")
        .exporterId("CN")
        .tariffType("Ad Valorem")
        .tariffRate(5.0)
        .minTariffAmt(10.0)
        .maxTariffAmt(5000.0)
        .startDate(LocalDate.of(2025, 1, 1))
        .endDate(LocalDate.of(2026, 12, 31))
        .build();
    repo.save(t);

    var found = repo.findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
        "010121", "SG", "CN", LocalDate.of(2025, 9, 15), LocalDate.of(2025, 9, 15));

    assertThat(found).isPresent();
    assertThat(found.get().getTariffRate()).isEqualTo(5.0);
    assertThat(found.get().getMinTariffAmt()).isEqualTo(10.0);
    assertThat(found.get().getMaxTariffAmt()).isEqualTo(5000.0);
  }
}
