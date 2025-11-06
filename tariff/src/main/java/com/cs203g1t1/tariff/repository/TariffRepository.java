package com.cs203g1t1.tariff.repository;

import com.cs203g1t1.tariff.domain.Tariff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

  /**
   * Find tariffs that overlap with the given date range for the same HS code and country pair.
   * Two date ranges overlap if: startDate1 <= endDate2 AND endDate1 >= startDate2
   * 
   * @param hsCode The HS code
   * @param importerId The importer country code
   * @param exporterId The exporter country code
   * @param startDate The start date of the range to check
   * @param endDate The end date of the range to check
   * @param excludeId Optional ID to exclude (for update operations), use null for create
   * @return List of overlapping tariffs
   */
  @Query("SELECT t FROM Tariff t WHERE t.hsCode = :hsCode " +
         "AND t.importerId = :importerId " +
         "AND t.exporterId = :exporterId " +
         "AND t.startDate <= :endDate " +
         "AND t.endDate >= :startDate " +
         "AND (:excludeId IS NULL OR t.id != :excludeId)")
  List<Tariff> findOverlappingTariffs(
      @Param("hsCode") String hsCode,
      @Param("importerId") String importerId,
      @Param("exporterId") String exporterId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate,
      @Param("excludeId") Long excludeId
  );
}
