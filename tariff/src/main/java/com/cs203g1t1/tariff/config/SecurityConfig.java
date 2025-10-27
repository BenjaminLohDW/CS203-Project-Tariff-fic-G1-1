package com.cs203g1t1.tariff.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@EnableWebSecurity
@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // our API is stateless
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // we provide JSON API, no CSRF tokens
            .csrf(csrf -> csrf.disable())
            // enable CORS using the bean below
            .cors(Customizer.withDefaults())
            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            // authorization rules
            .authorizeHttpRequests(auth -> auth
                // swagger & api docs
                .requestMatchers(
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html"
                ).permitAll()
                // health / ping endpoints
                .requestMatchers(
                    "/ping/**",
                    "/api/tariffs/health"
                ).permitAll()
                // preflight
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                // PUBLIC: Read-only tariff endpoints (for regular users)
                .requestMatchers(
                    org.springframework.http.HttpMethod.GET,
                    "/api/tariffs",
                    "/api/tariffs/effective",
                    "/api/tariffs/effective/by-names",
                    "/api/tariffs/by-hs/**",
                    "/api/tariffs/all"
                ).permitAll()
                // PROTECTED: Admin operations require JWT authentication
                .requestMatchers(
                    org.springframework.http.HttpMethod.POST,
                    "/api/tariffs/**"
                ).authenticated()
                .requestMatchers(
                    org.springframework.http.HttpMethod.PUT,
                    "/api/tariffs/**"
                ).authenticated()
                .requestMatchers(
                    org.springframework.http.HttpMethod.DELETE,
                    "/api/tariffs/**"
                ).authenticated()
                // any other stray endpoints → require auth by default
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
