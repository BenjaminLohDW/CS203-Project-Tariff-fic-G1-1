package com.cs203g1t1.tariff.dto;

import lombok.*;
import jakarta.validation.constraints.*;
import java.time.LocalDate;

@Data
@Getter @Setter
public class TariffCreateRequest {
  @NotBlank @Pattern(regexp="\\d{6,10}")
  private String hsCode;

  @NotNull private String importerId;
  @NotNull private String exporterId;

  @NotNull private String tariffType; // "advalorem" or "specific"

  @DecimalMin("0.0")
  private Double tariffRate;
  
  @DecimalMin("0.0")
  private Double specificAmt;
  private String specificUnit;

  @DecimalMin("0.0")
  private Double minTariffAmt;  // amount caps as Double

  @DecimalMin("0.0")
  private Double maxTariffAmt;

  @NotNull private LocalDate startDate;
  @NotNull private LocalDate endDate;
}
