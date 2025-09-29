// src/test/java/com/cs203g1t1/tariff/service/TariffServiceImplTest.java
package com.cs203g1t1.tariff.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.cs203g1t1.tariff.client.CountryClient;
import com.cs203g1t1.tariff.client.ProductClient;
import com.cs203g1t1.tariff.domain.Tariff;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.repository.TariffRepository;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TariffServiceImplTest {

  @Mock TariffRepository repo;
  @Mock ProductClient productClient;
  @Mock CountryClient countryClient;

  @InjectMocks TariffServiceImpl service; // pure unit test, no Spring context needed

  // Test inputs (now query params instead of DTO fields)
  private static final String PRODUCT_NAME = "smartphone";
  private static final String IMPORTER_COUNTRY_NAME = "Singapore";
  private static final String EXPORTER_COUNTRY_NAME = "China";
  private static final LocalDate DATE = LocalDate.of(2025, 1, 15);

  @Test
  void getOneEffectiveByNames_returnsResponse_whenRuleFound() {
    // Resolved identifiers from external MS
    String hs = "85171300";
    String impId = "SG";
    String expId = "CN";

    when(productClient.getHsCodeByProductName(eq(PRODUCT_NAME))).thenReturn(hs);
    when(countryClient.getCountryIdByName(eq(IMPORTER_COUNTRY_NAME))).thenReturn(impId);
    when(countryClient.getCountryIdByName(eq(EXPORTER_COUNTRY_NAME))).thenReturn(expId);

    // Mock repo call exactly as the service uses it
    Tariff t = Tariff.builder()
        .id(1L)
        .hsCode(hs)
        .importerId(impId)
        .exporterId(expId)
        .tariffType("Ad Valorem")
        .tariffRate(0.05)            // adjust types to match your entity
        .specificAmt(null)
        .specificUnit(null)
        .minTariffAmt(2.00)
        .maxTariffAmt(50.00)
        .startDate(LocalDate.of(2024, 1, 1))
        .endDate(LocalDate.of(2026, 12, 31))
        .build();

    when(repo.findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            eq(hs), eq(impId), eq(expId), eq(DATE), eq(DATE)))
        .thenReturn(Optional.of(t));

    TariffResponse resp = service.getOneEffectiveByNames(
        PRODUCT_NAME, IMPORTER_COUNTRY_NAME, EXPORTER_COUNTRY_NAME, DATE);

    assertThat(resp).isNotNull();
    assertThat(resp.getHsCode()).isEqualTo(hs);
    assertThat(resp.getImporterId()).isEqualTo(impId);
    assertThat(resp.getExporterId()).isEqualTo(expId);

    // If your TariffResponse uses BigDecimal for rates/amounts, equalByComparingTo with strings is safest
    assertThat(resp.getTariffRate()).isEqualByComparingTo(0.05);
    assertThat(resp.getMinTariffAmt()).isEqualByComparingTo(2.00);
    assertThat(resp.getMaxTariffAmt()).isEqualByComparingTo(50.00);

    assertThat(resp.getStartDate()).isEqualTo(LocalDate.of(2024, 1, 1));
    assertThat(resp.getEndDate()).isEqualTo(LocalDate.of(2026, 12, 31));
  }

  @Test
  void getOneEffectiveByNames_returnsNull_whenNoRuleFound() {
    String hs = "85171300";
    String impId = "SG";
    String expId = "CN";

    when(productClient.getHsCodeByProductName(eq(PRODUCT_NAME))).thenReturn(hs);
    when(countryClient.getCountryIdByName(eq(IMPORTER_COUNTRY_NAME))).thenReturn(impId);
    when(countryClient.getCountryIdByName(eq(EXPORTER_COUNTRY_NAME))).thenReturn(expId);

    when(repo.findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            eq(hs), eq(impId), eq(expId), eq(DATE), eq(DATE)))
        .thenReturn(Optional.empty());

    TariffResponse resp = service.getOneEffectiveByNames(
        PRODUCT_NAME, IMPORTER_COUNTRY_NAME, EXPORTER_COUNTRY_NAME, DATE);

    assertThat(resp).isNull();
  }
}
