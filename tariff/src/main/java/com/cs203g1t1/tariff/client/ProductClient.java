package com.cs203g1t1.tariff.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.ResourceAccessException;

import java.net.URI;
import java.util.Map;

@Component
public class ProductClient {

  private static final Logger log = LoggerFactory.getLogger(ProductClient.class);

  private final RestTemplate rest;
  private final URI lookupUri;

  public ProductClient(RestTemplate rest,
                       @Value("${product.baseUrl}") String baseUrl,
                       @Value("${product.lookup-path:/api/v1/hs-code/lookup}") String path) {
    this.rest = rest; // <-- built from slice-provided builder (mockable)
    this.lookupUri = UriComponentsBuilder.fromHttpUrl(baseUrl).path(path).build().toUri();
    log.info("LOOKUPURI = {}", this.lookupUri);
  }

  public String getHsCodeByProductName(String productName) {

    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      HttpEntity<Map<String, String>> entity =
          new HttpEntity<>(Map.of("query", productName), headers);

      log.info("Sending request to Product: body={}", entity);

      ResponseEntity<ProductLookupResponse> resp =
          rest.postForEntity(lookupUri, entity, ProductLookupResponse.class);

      log.info("Received response from Product: status={}, body={}", resp.getStatusCode(), resp.getBody());

      if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
            "Product lookup failed: status=" + resp.getStatusCode());
      }

      ProductLookupResponse body = resp.getBody();
      if (Boolean.FALSE.equals(body.success)) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
            "Product lookup error: " + body.errorMessage);
      }
      if (body.hsCode == null || body.hsCode.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
            "Product lookup returned empty hs_code for query=" + productName);
      }
      return body.hsCode;

    } catch (ResourceAccessException e) { // includes SocketTimeoutException
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
          "Product service timed out", e);
    } catch (RestClientException e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
          "Product service unreachable", e);
    }
  }

  public static class ProductLookupResponse {
    @com.fasterxml.jackson.annotation.JsonProperty("hs_code")
    public String hsCode;

    @com.fasterxml.jackson.annotation.JsonProperty("error_message")
    public String errorMessage;

    public Boolean success;

    public java.util.List<Suggestion> suggestions;
  }

  public static class Suggestion {
    @com.fasterxml.jackson.annotation.JsonProperty("hs_code")
    public String hsCode;
    public String description;
    public String unit;
  }
}
