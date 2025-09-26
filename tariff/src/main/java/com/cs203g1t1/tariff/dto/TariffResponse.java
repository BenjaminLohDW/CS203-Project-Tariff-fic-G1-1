package com.cs203g1t1.tariff.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@Getter @Setter
public class TariffResponse {
  private Long id;
  private String hsCode;
  private String importerId;
  private String exporterId;
  private String tariffType;
  private Double tariffRate;
  private Double specificAmt;
  private String specificUnit;
  private Double minTariffAmt;  // amount caps as Double
  private Double maxTariffAmt;
  private LocalDate startDate;
  private LocalDate endDate;
}
