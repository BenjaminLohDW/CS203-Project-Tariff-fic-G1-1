// src/test/java/com/cs203g1t1/tariff/controller/TariffControllerTest.java
package com.cs203g1t1.tariff.controller;

import com.cs203g1t1.tariff.dto.EffectiveByNamesRequest;
import com.cs203g1t1.tariff.dto.TariffCreateRequest;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.service.TariffService;
import com.fasterxml.jackson.databind.ObjectMapper; 

import org.hibernate.annotations.TimeZoneStorage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TariffController.class)
class TariffControllerTest {

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper om;

  @MockBean TariffService service;

  // ---------- helpers ----------
  private TariffResponse sampleResponse() {
    TariffResponse r = new TariffResponse();
    r.setId(1L);
    r.setHsCode("85171300");
    r.setImporterId("SG");
    r.setExporterId("CN");
    r.setTariffType("Ad Valorem");
    r.setTariffRate(0.05);
    r.setSpecificAmt(null);
    r.setSpecificUnit(null);
    r.setMinTariffAmt(2.00);
    r.setMaxTariffAmt(50.00);
    r.setStartDate(LocalDate.of(2024,1,1));
    r.setEndDate(LocalDate.of(2026,12,31));
    return r;
  }

  // ---------- POST /api/tariffs (create) ----------
  @Test
  void create_returns201_andBody() throws Exception {
    TariffCreateRequest req = new TariffCreateRequest();
    req.setHsCode("85171300");
    req.setImporterId("SG");
    req.setExporterId("CN");
    req.setTariffType("Ad Valorem");
    req.setTariffRate(0.05);
    req.setSpecificAmt(null);
    req.setSpecificUnit(null);
    req.setMinTariffAmt(2.00);
    req.setMaxTariffAmt(50.00);
    req.setStartDate(LocalDate.of(2024,1,1));
    req.setEndDate(LocalDate.of(2026,12,31));

    when(service.create(any(TariffCreateRequest.class))).thenReturn(sampleResponse());

    mvc.perform(post("/api/tariffs")
            .contentType(MediaType.APPLICATION_JSON)
            .content(om.writeValueAsString(req)))
        .andExpect(status().isCreated())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.hsCode").value("85171300"))
        .andExpect(jsonPath("$.tariffRate").value(0.05));
  }

  // ---------- GET /api/tariffs/effective ----------
  @Test
  void getEffective_found_returns200() throws Exception {
    when(service.getOneEffective(eq("85171300"), eq("SG"), eq("CN"), eq(LocalDate.of(2025,1,15))))
        .thenReturn(sampleResponse());

    mvc.perform(get("/api/tariffs/effective")
            .param("hs_code", "85171300")
            .param("importer", "SG")
            .param("exporter", "CN")
            .param("date", "2025-01-15"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.hsCode").value("85171300"))
        .andExpect(jsonPath("$.importerId").value("SG"))
        .andExpect(jsonPath("$.exporterId").value("CN"));
  }

  @Test
  void getEffective_notFound_returns404() throws Exception {
    when(service.getOneEffective(anyString(), anyString(), anyString(), any(LocalDate.class)))
        .thenReturn(null);

    mvc.perform(get("/api/tariffs/effective")
            .param("hs_code", "00000000")
            .param("importer", "SG")
            .param("exporter", "CN")
            .param("date", "2025-01-01"))
        .andExpect(status().isNotFound());
  }

  // ---------- GET /api/tariffs/effective/by-names ----------
  @Test
  void getOneEffectiveByNames_get_returns200_andPassesQueryParams() throws Exception {
    // Arrange
    String productName = "smartphone";
    String importerCountryName = "Singapore";
    String exporterCountryName = "China";
    LocalDate date = LocalDate.parse("2025-01-15");

    when(service.getOneEffectiveByNames(
            eq(productName),
            eq(importerCountryName),
            eq(exporterCountryName),
            eq(date)))
        .thenReturn(sampleResponse());

    // Act + Assert
    var result = mvc.perform(get("/api/tariffs/effective/by-names")
            .param("productName", productName)
            .param("importerCountryName", importerCountryName)
            .param("exporterCountryName", exporterCountryName)
            .param("date", "2025-01-15"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(jsonPath("$.hsCode").value("85171300"))
        .andReturn();

    assertThat(result.getResponse().getContentType()).contains("application/json");

    // Optional: verify the exact args passed to the service
    verify(service).getOneEffectiveByNames(
        eq(productName), eq(importerCountryName), eq(exporterCountryName), eq(date));
  }

  @Test
  void getOneEffectiveByNames_get_returns404_whenNotFound() throws Exception {
    when(service.getOneEffectiveByNames(anyString(), anyString(), anyString(), any(LocalDate.class)))
        .thenReturn(null);

    mvc.perform(get("/api/tariffs/effective/by-names")
            .param("productName", "NoSuchProduct")
            .param("importerCountryName", "Narnia")
            .param("exporterCountryName", "Westeros")
            .param("date", "2025-01-15"))
        .andExpect(status().isNotFound());
  }

  // Previous helper for POST body request
  // // ---------- POST /api/tariffs/effective/by-names ----------
  // @Test
  // void getOneEffectiveByNames_post_returns200_andPassesDTO() throws Exception {
  //   // Arrange request body that matches YOUR DTO fields
  //   var body = "{\n"
  //       + "  \"productName\": \"Smartphone\",\n"
  //       + "  \"importerCountryName\": \"Singapore\",\n"
  //       + "  \"exporterCountryName\": \"China\",\n"
  //       + "  \"date\": \"2025-01-15\"\n"
  //       + "}";

  //   when(service.getOneEffectiveByNames(any(EffectiveByNamesRequest.class)))
  //       .thenReturn(sampleResponse());

  //   var result = mvc.perform(post("/api/tariffs/effective/by-names")
  //           .contentType(MediaType.APPLICATION_JSON)
  //           .content(body))
  //       .andExpect(status().isOk())
  //       .andExpect(jsonPath("$.hsCode").value("85171300"))
  //       .andReturn();

  //   // (Optional) capture & assert the DTO passed into the service
  //   ArgumentCaptor<EffectiveByNamesRequest> cap = ArgumentCaptor.forClass(EffectiveByNamesRequest.class);
  //   // Since we used when(...).thenReturn(...) above, direct verification is enough in Mockito 5+
  //   // If you prefer, switch to Mockito.verify(service).getOneEffectiveByNames(cap.capture());
  //   // But @WebMvcTest + MockBean doesn't require verification for a passing controller test.

  //   // Basic sanity: confirm response content type
  //   assertThat(result.getResponse().getContentType()).contains("application/json");
  // }

  // ---------- GET /api/tariffs (list by combo) ----------
  @Test
  void listByCombo_returns200_andArray() throws Exception {
    when(service.listByCombo(eq("85171300"), eq("SG"), eq("CN")))
        .thenReturn(List.of(sampleResponse(), sampleResponse()));

    mvc.perform(get("/api/tariffs")
            .param("hs_code", "85171300")
            .param("importer", "SG")
            .param("exporter", "CN"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].hsCode").value("85171300"));
  }

  // ---------- GET /api/tariffs/by-hs/{hsCode} ----------
  @Test
  void listByHs_returns200_andArray() throws Exception {
    when(service.listByHsCode(eq("85171300")))
        .thenReturn(List.of(sampleResponse()));

    mvc.perform(get("/api/tariffs/by-hs/85171300"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].hsCode").value("85171300"));
  }

  @Test 
  void listAll_returns200_andArray() throws Exception {
    when(service.listAll())
        .thenReturn(List.of(sampleResponse(), sampleResponse()));

    mvc.perform(get("/api/tariffs/all"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2))
        .andExpect(jsonPath("$[0].hsCode").value("85171300"));
  }
}
