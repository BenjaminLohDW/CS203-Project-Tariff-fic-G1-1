package com.cs203g1t1.tariff.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import java.util.Optional;

@EnableWebSecurity
@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final Optional<DevAuthFilter> devAuthFilter; // optional (only present when property=true)
    
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                            Optional<DevAuthFilter> devAuthFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.devAuthFilter = devAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // our API is stateless
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // we provide JSON API, no CSRF tokens
            .csrf(csrf -> csrf.disable())
            // enable CORS using the bean below
            .cors(Customizer.withDefaults());

        // Add the bypass first if enabled
        devAuthFilter.ifPresent(f ->
            http.addFilterBefore(f, UsernamePasswordAuthenticationFilter.class)
        );

        // Add JWT filter before UsernamePasswordAuthenticationFilter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        http
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
