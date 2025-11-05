package com.cs203g1t1.tariff.service;

import com.cs203g1t1.tariff.dto.TariffCreateRequest;
import com.cs203g1t1.tariff.dto.TariffResponse;
import com.cs203g1t1.tariff.dto.EffectiveByNamesRequest;
import java.time.LocalDate;
import java.util.List;

public interface TariffService {
  // Previously used with POST method (see commented out code in TariffController)
  // TariffResponse getOneEffectiveByNames(EffectiveByNamesRequest req);
  TariffResponse getOneEffectiveByNames(String productName, String importerCountryName, String exporterCountryName, LocalDate date);
  TariffResponse create(TariffCreateRequest req);
  TariffResponse update(Long id, TariffCreateRequest req);
  TariffResponse getOneEffective(String hsCode, String importeId, String exporterId, LocalDate date);
  List<TariffResponse> listByProductName(String productName);
  List<TariffResponse> listByCombo(String hsCode, String importerId, String exporterId);
  List<TariffResponse> listByHsCode(String hsCode);
  List<TariffResponse> listAll();
}
