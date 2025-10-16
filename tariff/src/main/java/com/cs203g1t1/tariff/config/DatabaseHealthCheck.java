package com.cs203g1t1.tariff.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Slf4j
@Component
@Profile("aws")
public class DatabaseHealthCheck {

    @Autowired
    private DataSource dataSource;

    @PostConstruct
    public void checkDatabaseConnection() {
        int maxRetries = 30;
        int retryCount = 0;
        long retryDelay = 5000; // 5 seconds

        while (retryCount < maxRetries) {
            try {
                JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
                jdbcTemplate.queryForObject("SELECT 1", Integer.class);
                log.info("✅ Database connection successful!");
                return;
            } catch (Exception e) {
                retryCount++;
                log.warn("⚠️ Database connection attempt {} of {} failed: {}. Retrying in {}ms...", 
                    retryCount, maxRetries, e.getMessage(), retryDelay);
                
                if (retryCount >= maxRetries) {
                    log.error("❌ Failed to connect to database after {} attempts", maxRetries);
                    throw new RuntimeException("Could not establish database connection", e);
                }
                
                try {
                    Thread.sleep(retryDelay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while waiting to retry database connection", ie);
                }
            }
        }
    }
}