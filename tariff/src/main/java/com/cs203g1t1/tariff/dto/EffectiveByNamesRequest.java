package com.cs203g1t1.tariff.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
    
public class EffectiveByNamesRequest {
  @NotBlank private String productName;
  @NotBlank private String importerCountryName;
  @NotBlank private String exporterCountryName;
  @NotNull  private LocalDate date;

  // getters/setters
  public String getProductName() { return productName; }
  public void setProductName(String productName) { this.productName = productName; }
  public String getImporterCountryName() { return importerCountryName; }
  public void setImporterCountryName(String importerCountryName) { this.importerCountryName = importerCountryName; }
  public String getExporterCountryName() { return exporterCountryName; }
  public void setExporterCountryName(String exporterCountryName) { this.exporterCountryName = exporterCountryName; }
  public LocalDate getDate() { return date; }
  public void setDate(LocalDate date) { this.date = date; }
}
