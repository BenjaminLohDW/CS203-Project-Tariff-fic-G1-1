// src/test/java/com/cs203g1t1/tariff/dto/EffectiveByNamesRequestTest.java
package com.cs203g1t1.tariff.dto;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

public class EffectiveByNamesRequestTest {

  private static ValidatorFactory factory;
  private static Validator validator;

  @BeforeAll
  static void setupValidator() {
    factory = Validation.buildDefaultValidatorFactory();
    validator = factory.getValidator();
  }

  @AfterAll
  static void tearDown() {
    factory.close();
  }

  private EffectiveByNamesRequest validRequest() {
    EffectiveByNamesRequest req = new EffectiveByNamesRequest();
    req.setProductName("Smartphone");
    req.setImporterCountryName("Singapore");
    req.setExporterCountryName("China");
    req.setDate(LocalDate.now());
    return req;
  }

  @Test
  void valid_whenAllFieldsPresent() {
    var req = validRequest();
    Set<ConstraintViolation<EffectiveByNamesRequest>> violations = validator.validate(req);
    assertEquals(0, violations.size(), "Expected no validation errors");
  }

  @Test
  void invalid_whenMissingProductName() {
    var req = validRequest();
    req.setProductName(null);

    var violations = validator.validate(req);
    assertTrue(
        violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("productName")),
        "Expected a violation on productName"
    );
  }

  @Test
  void invalid_whenMissingImporterCountryName() {
    var req = validRequest();
    req.setImporterCountryName(null);

    var violations = validator.validate(req);
    assertTrue(
        violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("importerCountryName")),
        "Expected a violation on importerCountryName"
    );
  }

  @Test
  void invalid_whenMissingExporterCountryName() {
    var req = validRequest();
    req.setExporterCountryName(null);

    var violations = validator.validate(req);
    assertTrue(
        violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("exporterCountryName")),
        "Expected a violation on exporterCountryName"
    );
  }

  @Test
  void invalid_whenMissingDate() {
    var req = validRequest();
    req.setDate(null);

    var violations = validator.validate(req);
    assertTrue(
        violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("date")),
        "Expected a violation on date"
    );
  }
}
