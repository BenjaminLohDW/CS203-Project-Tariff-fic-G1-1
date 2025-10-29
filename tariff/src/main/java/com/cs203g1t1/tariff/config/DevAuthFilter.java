// src/main/java/com/cs203g1t1/tariff/config/DevAuthFilter.java
package com.cs203g1t1.tariff.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Header format:
 *   X-Bypass-Auth: username[:ROLE_A,ROLE_B]
 * Examples:
 *   X-Bypass-Auth: alice
 *   X-Bypass-Auth: admin@local:ROLE_ADMIN,ROLE_USER
 */
@Component
@ConditionalOnProperty(name = "security.dev-bypass", havingValue = "true")
public class DevAuthFilter extends OncePerRequestFilter {
  public static final String HEADER = "X-Bypass-Auth";

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {

    if (SecurityContextHolder.getContext().getAuthentication() == null) {
      String val = req.getHeader(HEADER);
      if (val != null && !val.isBlank()) {
        String[] parts = val.split(":", 2);
        var username = parts[0].trim();
        var authorities = (parts.length == 2)
            ? Arrays.stream(parts[1].split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList())
            : java.util.List.<SimpleGrantedAuthority>of();

        var auth = new UsernamePasswordAuthenticationToken(username, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
      }
    }
    chain.doFilter(req, res);
  }
}
