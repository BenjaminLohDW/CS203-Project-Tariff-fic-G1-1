package com.cs203g1t1.tariff.service;

import com.cs203g1t1.tariff.client.ProductClient;
import com.cs203g1t1.tariff.client.CountryClient;
import com.cs203g1t1.tariff.domain.Tariff;
import com.cs203g1t1.tariff.dto.TariffCreateRequest;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.dto.EffectiveByNamesRequest;
import com.cs203g1t1.tariff.repository.TariffRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Profile({"local", "test", "docker", "aws"}) // activate this when running with profile=local
@Service
public class TariffServiceImpl implements TariffService {

  private final ProductClient productClient;
  private final CountryClient countryClient;
  private final TariffRepository repo;

  public TariffServiceImpl(TariffRepository repo, ProductClient productClient, CountryClient countryClient) { 
    this.repo = repo; 
    this.productClient = productClient;
    this.countryClient = countryClient;
  }

  // ============ Orchestration by names ============
  @Override
  public TariffResponse getOneEffectiveByNames(String productName, String importerCountryName, String exporterCountryName, LocalDate date) {

    String hs = productClient.getHsCodeByProductName(productName);             // name -> HS code
    String impId = countryClient.getCountryIdByName(importerCountryName);      // name -> id
    String expId = countryClient.getCountryIdByName(exporterCountryName);      // name -> id
    return getOneEffective(hs, impId, expId, date);                            // reuse domain method
  }

  @Override
  public TariffResponse create(TariffCreateRequest req) {
    Tariff t = Tariff.builder()
        .hsCode(req.getHsCode())
        .importerId(req.getImporterId())
        .exporterId(req.getExporterId())
        .tariffType(req.getTariffType())
        .tariffRate(req.getTariffRate())
        .specificAmt(req.getSpecificAmt())
        .specificUnit(req.getSpecificUnit())
        .minTariffAmt(req.getMinTariffAmt())
        .maxTariffAmt(req.getMaxTariffAmt())
        .startDate(req.getStartDate())
        .endDate(req.getEndDate())
        .build();
    Tariff saved = repo.save(t);
    return toResponse(saved);
  }

  @Override
  @Transactional
  public TariffResponse update(Long id, TariffCreateRequest req) throws DataAccessException, RestClientException {
      Tariff entity = repo.findById(id).orElse(null);
      if (entity == null) {
          return null; // controller will 404
      }

      // --- Validation (throwing -> controller maps to 400/409 as you set up) ---
      if (req.getStartDate() != null && req.getEndDate() != null
              && req.getEndDate().isBefore(req.getStartDate())) {
          throw new IllegalArgumentException("endDate cannot be before startDate");
      }
      if (req.getTariffRate() != null && req.getTariffRate() < 0) {
          throw new IllegalArgumentException("tariffRate cannot be negative");
      }
      if (req.getSpecificAmt() != null && req.getSpecificAmt() < 0) {
          throw new IllegalArgumentException("specificAmt cannot be negative");
      }
      if (req.getMinTariffAmt() != null && req.getMinTariffAmt() < 0) {
          throw new IllegalArgumentException("minTariffAmt cannot be negative");
      }
      if (req.getMaxTariffAmt() != null && req.getMaxTariffAmt() < 0) {
          throw new IllegalArgumentException("maxTariffAmt cannot be negative");
      }
      if (req.getMinTariffAmt() != null && req.getMaxTariffAmt() != null
              && req.getMinTariffAmt().compareTo(req.getMaxTariffAmt()) > 0) {
          throw new IllegalArgumentException("minTariffAmt cannot exceed maxTariffAmt");
      }

      // Full replace of mutable fields — adapt names to your entity/DTO
      entity.setHsCode(nzt(req.getHsCode()));
      entity.setImporterId(nzt(req.getImporterId()));
      entity.setExporterId(nzt(req.getExporterId()));
      entity.setTariffType(nzt(req.getTariffType()));
      entity.setTariffRate(req.getTariffRate());
      entity.setSpecificAmt(req.getSpecificAmt());
      entity.setSpecificUnit(req.getSpecificUnit());
      entity.setMinTariffAmt(req.getMinTariffAmt());
      entity.setMaxTariffAmt(req.getMaxTariffAmt());
      entity.setStartDate(req.getStartDate());
      entity.setEndDate(req.getEndDate());

      Tariff saved = repo.save(entity);
      return toResponse(saved);
  }

  // null->"" trimmed, otherwise trimmed; adjust to return null instead if you prefer to keep nulls:
  private static String nzt(String s) {
      return (s == null) ? null : s.trim();
  }

  @Override
  public TariffResponse getOneEffective(String hs, String imp, String exp, LocalDate date) {
    return repo.findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            hs, imp, exp, date, date)
        .map(this::toResponse)
        .orElse(null);
  }

  @Override
  public List<TariffResponse> listByProductName(String productName) {
    String hs = productClient.getHsCodeByProductName(productName);
    return repo.findByHsCode(hs).stream().map(this::toResponse).toList();
  }

  @Override
  public List<TariffResponse> listByCombo(String hs, String imp, String exp) {
    return repo.findByHsCodeAndImporterIdAndExporterId(hs, imp, exp)
        .stream().map(this::toResponse).toList();
  }

  @Override
  public List<TariffResponse> listByHsCode(String hs) {
    return repo.findByHsCode(hs).stream().map(this::toResponse).toList();
  }

  @Override
  public List<TariffResponse> listAll() {
    return repo.findAll().stream().map(this::toResponse).toList();
  }

  private TariffResponse toResponse(Tariff t) {
    TariffResponse r = new TariffResponse();
    r.setId(t.getId());
    r.setHsCode(t.getHsCode());
    r.setImporterId(t.getImporterId());
    r.setExporterId(t.getExporterId());
    r.setTariffType(t.getTariffType());
    r.setTariffRate(t.getTariffRate());
    r.setSpecificAmt(t.getSpecificAmt());
    r.setSpecificUnit(t.getSpecificUnit());
    r.setMinTariffAmt(t.getMinTariffAmt());
    r.setMaxTariffAmt(t.getMaxTariffAmt());
    r.setStartDate(t.getStartDate());
    r.setEndDate(t.getEndDate());
    return r;
  }
}
