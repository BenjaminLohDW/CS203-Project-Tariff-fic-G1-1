// src/test/java/com/cs203g1t1/tariff/service/TariffServiceImplTest.java
package com.cs203g1t1.tariff.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.cs203g1t1.tariff.client.CountryClient;
import com.cs203g1t1.tariff.client.ProductClient;
import com.cs203g1t1.tariff.domain.Tariff;
import com.cs203g1t1.tariff.dto.EffectiveByNamesRequest;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.repository.TariffRepository;
import java.math.BigDecimal;
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

  private EffectiveByNamesRequest makeReq() {
    EffectiveByNamesRequest req = new EffectiveByNamesRequest();
    req.setProductName("Smartphone");
    req.setImporterCountryName("Singapore");
    req.setExporterCountryName("China");
    req.setDate(LocalDate.of(2025, 1, 15));
    return req;
  }

  @Test
  void getOneEffectiveByNames_returnsResponse_whenRuleFound() {
    var req = makeReq();

    // What the service resolves
    String hs = "85171300";
    String impId = "SG";  // example
    String expId = "CN";  // example

    when(productClient.getHsCodeByProductName(eq("Smartphone"))).thenReturn(hs);
    when(countryClient.getCountryIdByName(eq("Singapore"))).thenReturn(impId);
    when(countryClient.getCountryIdByName(eq("China"))).thenReturn(expId);

    // Mock repo method EXACTLY as used in service
    Tariff t = Tariff.builder()
        .id(1L)
        .hsCode(hs)
        .importerId(impId)
        .exporterId(expId)
        .tariffType("Ad Valorem")
        .tariffRate(0.05)
        .specificAmt(null)
        .specificUnit(null)
        .minTariffAmt(2.00)
        .maxTariffAmt(50.00)
        .startDate(LocalDate.of(2024, 1, 1))
        .endDate(LocalDate.of(2026, 12, 31))
        .build();

    when(repo.findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            eq(hs), eq(impId), eq(expId), eq(req.getDate()), eq(req.getDate())))
        .thenReturn(Optional.of(t));

    TariffResponse resp = service.getOneEffectiveByNames(req);

    assertThat(resp).isNotNull();
    assertThat(resp.getHsCode()).isEqualTo(hs);
    assertThat(resp.getImporterId()).isEqualTo(impId);
    assertThat(resp.getExporterId()).isEqualTo(expId);
    assertThat(resp.getTariffRate()).isEqualByComparingTo(0.05);
    assertThat(resp.getMinTariffAmt()).isEqualByComparingTo(2.00);
    assertThat(resp.getMaxTariffAmt()).isEqualByComparingTo(50.00);
    assertThat(resp.getStartDate()).isEqualTo(LocalDate.of(2024, 1, 1));
    assertThat(resp.getEndDate()).isEqualTo(LocalDate.of(2026, 12, 31));
  }

  @Test
  void getOneEffectiveByNames_returnsNull_whenNoRuleFound() {
    var req = makeReq();

    String hs = "85171300";
    String impId = "SG";
    String expId = "CN";

    when(productClient.getHsCodeByProductName(eq("Smartphone"))).thenReturn(hs);
    when(countryClient.getCountryIdByName(eq("Singapore"))).thenReturn(impId);
    when(countryClient.getCountryIdByName(eq("China"))).thenReturn(expId);

    when(repo.findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            eq(hs), eq(impId), eq(expId), eq(req.getDate()), eq(req.getDate())))
        .thenReturn(Optional.empty());

    TariffResponse resp = service.getOneEffectiveByNames(req);
    assertThat(resp).isNull();
  }
}
