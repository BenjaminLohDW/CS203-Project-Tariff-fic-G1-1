package com.cs203g1t1.tariff.controller;

import com.cs203g1t1.tariff.dto.TariffCreateRequest;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.dto.ErrorResponse;
import com.cs203g1t1.tariff.service.TariffService;
import com.cs203g1t1.tariff.dto.EffectiveByNamesRequest;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.dao.DataAccessException;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tariffs")
@CrossOrigin(origins = {
    "http://localhost:5173",  // Local Vite dev server
    "http://localhost:5174",  // Local Vite dev server (alternative port)
    "http://localhost:3000",  // Local React dev server
    "http://frontend:5173",   // Docker frontend container
    "http://127.0.0.1:5173", // Alternative localhost
    "http://127.0.0.1:5174", // Alternative localhost
    "http://127.0.0.1:3000"  // Alternative localhost
}, allowCredentials = "true", maxAge = 3600)
public class TariffController {

  private final TariffService service;

  public TariffController(TariffService service) {
    this.service = service;
  }

  /**
   * Create a tariff record (admin use)
   */
  @PostMapping
  public ResponseEntity<?> create(@Valid @RequestBody TariffCreateRequest req) {
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    } catch (IllegalArgumentException e) {
      // Validation errors (e.g., invalid date ranges, negative values)
      ErrorResponse error = new ErrorResponse(e.getMessage(), HttpStatus.BAD_REQUEST.value());
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    } catch (IllegalStateException e) {
      // Domain conflicts (e.g., duplicate/overlapping tariffs)
      ErrorResponse error = new ErrorResponse(e.getMessage(), HttpStatus.CONFLICT.value());
      return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    } catch (RestClientException e) {
      // Downstream service lookups failed (product/country microservices)
      ErrorResponse error = new ErrorResponse("External service unavailable", HttpStatus.BAD_GATEWAY.value());
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
    } catch (DataAccessException e) {
      // Database errors
      ErrorResponse error = new ErrorResponse("Database error", HttpStatus.INTERNAL_SERVER_ERROR.value());
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
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

  @GetMapping("effective/by-names")
    public ResponseEntity<TariffResponse> getOneEffectiveByNames(
            @RequestParam("productName") String productName,
            @RequestParam("importerCountryName") String importerCountryName,
            @RequestParam("exporterCountryName") String exporterCountryName,
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        TariffResponse result = service.getOneEffectiveByNames(
                productName.trim(),
                importerCountryName.trim(),
                exporterCountryName.trim(),
                date
        );

        if (result == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(result);
    }

  @GetMapping("/by-product")
    public ResponseEntity<List<TariffResponse>> listByProductName(
            @RequestParam("productName") String productName
    ) {
        try {
            List<TariffResponse> tariffs = service.listByProductName(productName.trim());
            if (tariffs == null || tariffs.isEmpty()) {
              return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(tariffs);
        } catch (RestClientException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build(); // product/country call failed
        } catch (DataAccessException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(); // DB error
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

  /**
   * Update tariff record by id (admin use)
   * PUT /api/tariffs/{id}
   *
   * Semantics: full replace of mutable fields using TariffCreateRequest.
   * Responses:
   *  - 200 OK with updated body
   *  - 404 Not Found if id doesn't exist
   *  - 400 Bad Request for invalid request data (e.g., bad dates)
   *  - 409 Conflict if your service enforces non-overlapping validity ranges and detects a clash
   *  - 502 Bad Gateway if dependent microservice lookup fails
   *  - 500 Internal Server Error on DB errors
   */
  @PutMapping("/{id}")
  public ResponseEntity<TariffResponse> update(
      @PathVariable Long id,
      @Valid @RequestBody TariffCreateRequest req
  ) {
    try {
      TariffResponse updated = service.update(id, req);
      if (updated == null) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
      }
      return ResponseEntity.ok(updated);
    } catch (IllegalArgumentException e) {
      // e.g., req validation beyond bean validation, invalid date ranges, etc.
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    } catch (IllegalStateException e) {
      // use this in service for domain conflicts, e.g., validity-range overlap with another record
      return ResponseEntity.status(HttpStatus.CONFLICT).build();
    } catch (RestClientException e) {
      // downstream product/country/agreement lookups failed
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
    } catch (DataAccessException e) {
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @GetMapping("/health")
  public Map<String, String> healthCheck() {
    return Map.of("status", "Tariff service is healthy");
  }
}
