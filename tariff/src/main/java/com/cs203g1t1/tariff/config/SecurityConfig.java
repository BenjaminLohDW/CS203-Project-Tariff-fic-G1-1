package com.cs203g1t1.tariff.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@EnableWebSecurity
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // our API is stateless
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // we provide JSON API, no CSRF tokens
            .csrf(csrf -> csrf.disable())
            // enable CORS using the bean below
            .cors(Customizer.withDefaults())
            // HTTP Basic for protected endpoints
            .httpBasic(Customizer.withDefaults())
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
                // everything under /api/** requires auth
                .requestMatchers("/api/**").authenticated()
                // any other stray endpoints → require auth by default
                .anyRequest().authenticated()
            );

        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public UserDetailsService userDetailsService() {
        UserDetails user = User.withUsername("tariff_admin")
            .password(passwordEncoder().encode("tariff_admin"))
            .roles("ADMIN")
            .build();
        
        return new InMemoryUserDetailsManager(user);
    }
    
}
