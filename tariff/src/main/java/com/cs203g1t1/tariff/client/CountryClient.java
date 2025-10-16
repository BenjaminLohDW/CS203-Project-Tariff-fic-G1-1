// src/main/java/com/cs203g1t1/tariff/service/CountryClient.java
package com.cs203g1t1.tariff.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class CountryClient {
  private final RestTemplate rest;
  private final String baseUrl;
  private final String byNamePath;

  public CountryClient(RestTemplate rest,
                       @Value("${country.baseUrl}") String baseUrl,
                       @Value("${country.by-name-path:/api/countries/by-name}") String byNamePath) {
    this.rest = rest;
    this.baseUrl = baseUrl;
    this.byNamePath = byNamePath;
  }

  public String getCountryIdByName(String name) {
    var uri = UriComponentsBuilder.fromHttpUrl(baseUrl)
        .path(byNamePath).queryParam("name", name).build().toUri();
    var resp = rest.exchange(uri, HttpMethod.GET, null, CountryResponse.class);
    if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null || resp.getBody().data == null) {
      throw new RuntimeException("Country not found: " + name);
    }
    return resp.getBody().data.code; // e.g. "SG"
  }

  public static class CountryResponse {
    @JsonProperty("code") public Integer code;
    @JsonProperty("data") public CountryData data;
  }

  public static class CountryData {
    @JsonProperty("code") public String code; // "SG"
    @JsonProperty("country_id") public Integer countryId; // 153
    @JsonProperty("name") public String name; // "Singapore"
  }
}
