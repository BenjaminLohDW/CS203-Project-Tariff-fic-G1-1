// package com.cs203g1t1.tariff.config;

// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.web.reactive.function.client.WebClient;

// @Configuration
// public class ExternalClientsConfig {

//   @Bean
//   WebClient productWebClient(@Value("${product.base-url}") String baseUrl) {
//     return WebClient.builder().baseUrl(baseUrl).build();
//   }

//   @Bean
//   WebClient countryWebClient(@Value("${country.base-url}") String baseUrl) {
//     return WebClient.builder().baseUrl(baseUrl).build();
//   }
// }
