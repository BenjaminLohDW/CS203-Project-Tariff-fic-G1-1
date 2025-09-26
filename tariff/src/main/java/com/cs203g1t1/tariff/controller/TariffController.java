package com.cs203g1t1.tariff.controller;

import com.cs203g1t1.tariff.dto.TariffCreateRequest;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.service.TariffService;
import com.cs203g1t1.tariff.dto.EffectiveByNamesRequest;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tariffs")
public class TariffController {

  private final TariffService service;

  public TariffController(TariffService service) {
    this.service = service;
  }

  /**
   * Create a tariff record (admin use)
   */
  @PostMapping
  public ResponseEntity<TariffResponse> create(@Valid @RequestBody TariffCreateRequest req) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
  }

  /**
   * Get one effective tariff by hs_code + importer/exporter country names on a given date.
   * Example:
   * GET /api/tariffs/effective?hs_code=010121&importer=Singapore&exporter=Malaysia&date=2025-09-15
   */
  @GetMapping("/effective")
  public ResponseEntity<TariffResponse> getEffective(
      @RequestParam("hs_code") String hsCode,
      @RequestParam("importer") String importerId,
      @RequestParam("exporter") String exporterId,
      @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
  ) {
    try {
      TariffResponse r = service.getOneEffective(hsCode, importerId, exporterId, date);
      return (r != null) ? ResponseEntity.ok(r) : ResponseEntity.notFound().build();
    } catch (RestClientException e) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build(); // product/country call failed
    } catch (DataAccessException e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // DB error
    }
  }

  @PostMapping("/effective/by-names")
  public ResponseEntity<TariffResponse> getOneEffectiveByNames(
      @Valid @RequestBody EffectiveByNamesRequest req
  ) {
    try {
      TariffResponse r = service.getOneEffectiveByNames(req);
      return (r != null) ? ResponseEntity.ok(r) : ResponseEntity.notFound().build();
    } catch (RestClientException e) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
    } catch (DataAccessException e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * List all tariffs for a given hs_code + importer/exporter (no date filter).
   * GET /api/tariffs?hs_code=010121&importer=Singapore&exporter=Malaysia
   */
  @GetMapping
  public List<TariffResponse> listByCombo(
      @RequestParam("hs_code") String hsCode,
      @RequestParam("importer") String importerId,
      @RequestParam("exporter") String exporterId
  ) {
    return service.listByCombo(hsCode, importerId, exporterId);
  }

  /**
   * List by hs_code only.
   * GET /api/tariffs/by-hs/010121
   */
  @GetMapping("/by-hs/{hsCode}")
  public List<TariffResponse> listByHs(@PathVariable String hsCode) {
    return service.listByHsCode(hsCode);
  }

  /**
   * List all tariffs.
   * GET /api/tariffs/all
   */
  @GetMapping("/all")
  public ResponseEntity<List<TariffResponse>> listAll() {
    return ResponseEntity.ok(service.listAll());
  }
}
