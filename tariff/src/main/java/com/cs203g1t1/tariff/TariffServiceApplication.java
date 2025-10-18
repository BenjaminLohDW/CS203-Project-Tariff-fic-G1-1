package com.cs203g1t1.tariff;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import jakarta.annotation.PostConstruct;

@SpringBootApplication
public class TariffServiceApplication {

  private static final Logger log = LoggerFactory.getLogger(TariffServiceApplication.class);
  
  @Value("${spring.profiles.active:NOT_SET}")
  private String activeProfile;
  
  @Value("${spring.datasource.url:NOT_SET}")
  private String dbUrl;
  
  public static void main(String[] args) {
    SpringApplication.run(TariffServiceApplication.class, args);
  }

  @PostConstruct
  public void logEnvironment() {
    log.info("=".repeat(80));
    log.info("🚀 TARIFF SERVICE STARTING");
    log.info("Active Profile: {}", activeProfile);
    log.info("Database URL: {}", maskJdbcUrl(dbUrl));
    log.info("DB_HOST env: {}", System.getenv("DB_HOST"));
    log.info("DB_PORT env: {}", System.getenv("DB_PORT"));
    log.info("DB_NAME env: {}", System.getenv("DB_NAME"));
    log.info("DB_USER env: {}", System.getenv("DB_USER"));
    log.info("SPRING_PROFILES_ACTIVE env: {}", System.getenv("SPRING_PROFILES_ACTIVE"));
    log.info("COUNTRY_MS_BASE env: {}", System.getenv("COUNTRY_MS_BASE"));
    log.info("PRODUCT_MS_BASE env: {}", System.getenv("PRODUCT_MS_BASE"));
    log.info("=".repeat(80));
  }

  /** Mask password in JDBC URLs like: jdbc:postgresql://host:port/db?user=u&password=... */
  private String maskJdbcUrl(String url) {
    if (url == null) return "NOT_SET";
    // mask user:pass in URLs that embed credentials, e.g., postgres://user:pass@host/db
    String masked = url.replaceAll(":[^:@]+@", ":****@");
    // also mask password query param if present
    masked = masked.replaceAll("(?i)(password=)([^&]+)", "$1****");
    return masked;
  }
}
