package com.cs203g1t1.tariff.repository;

import com.cs203g1t1.tariff.domain.Tariff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TariffRepository extends JpaRepository<Tariff, Long> {

  // Inclusive date bounds finder (effective on given date)
  Optional<Tariff> findFirstByHsCodeAndImporterIdAndExporterIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
      String hsCode, String importerId, String exporterId, LocalDate date1, LocalDate date2);

  // Convenience finders (optional but handy)
  List<Tariff> findByHsCode(String hsCode);

  List<Tariff> findByHsCodeAndImporterIdAndExporterId(String hsCode, String importerId, String exporterId);
}
