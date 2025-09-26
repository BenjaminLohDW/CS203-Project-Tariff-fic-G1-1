package com.cs203g1t1.tariff.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Getter
@Setter
@Table(name = "tariff")
public class Tariff {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "hs_code", nullable = false, length = 10)
  private String hsCode;

  @Column(name = "importer_id", nullable = false, length = 2)
  private String importerId;

  @Column(name = "exporter_id", nullable = false, length = 2)
  private String exporterId;

  @Column(name = "tariff_type", nullable = false, length = 20)
  private String tariffType; // "advalorem" or "specific"

  @Column(name = "tariff_rate")
  private Double tariffRate; // percentage, e.g., 5.0

  @Column(name = "specific_amt")
  private Double specificAmt; // amount, e.g., 100.0

  @Column(name = "specific_unit", length = 20)
  private String specificUnit; // e.g., "USD per ton"

  @Column(name = "min_tariff_amt")
  private Double minTariffAmt; // amount cap (optional)

  @Column(name = "max_tariff_amt")
  private Double maxTariffAmt; // amount cap (optional)

  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date", nullable = false)
  private LocalDate endDate;
}
