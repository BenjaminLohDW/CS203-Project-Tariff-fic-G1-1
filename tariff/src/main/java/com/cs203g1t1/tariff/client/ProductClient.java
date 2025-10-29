package com.cs203g1t1.tariff.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import org.springframework.web.client.ResourceAccessException;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Component
public class ProductClient {

  private static final Logger log = LoggerFactory.getLogger(ProductClient.class);

  private final RestTemplate rest;
  private final URI searchUri;

  public ProductClient(RestTemplate rest,
                       @Value("${product.baseUrl}") String baseUrl,
                       @Value("${product.lookup-path:/api/v1/hs-code/search}") String path) {
    this.rest = rest; // <-- built from slice-provided builder (mockable)
    this.searchUri = UriComponentsBuilder.fromHttpUrl(baseUrl).path(path).build().toUri();
    log.info("PRODUCT hs-code search URI = {}", this.searchUri);
  }

  public String getHsCodeByProductName(String productName) {

    try {
      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);

      Map<String, String> requestBody = Map.of("query", productName);
      HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);

      log.info("Sending hs-code search request to Product: uri={}, body={}", searchUri, requestBody);

      ResponseEntity<ProductSearchResponse> resp =
          rest.postForEntity(searchUri, entity, ProductSearchResponse.class);

      log.info("Received response from Product: status={}, body={}", resp.getStatusCode(), resp.getBody());

      if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
            "Product hs-code search failed: status=" + resp.getStatusCode());
      }

      ProductSearchResponse bodyObj = resp.getBody();

      if (bodyObj.results == null || bodyObj.results.isEmpty()) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
            "Product hs-code search returned no results for query=" + productName);
      }

      String subheading = bodyObj.results.get(0).subheading;
      if (subheading == null || subheading.isBlank()) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
            "Product hs-code search returned empty subheading for query=" + productName);
      }

      // Normalize: remove dots so downstream uses a clean HS code
      String normalized = subheading.replace(".", "");
      
      log.info("Resolved HS code '{}' -> normalized and padded to '{}'", subheading, normalized);
      return normalized;

    } catch (ResourceAccessException e) { // includes timeouts
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
          "Product service timed out", e);
    } catch (RestClientException e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
          "Product service unreachable", e);
    }
  }

  // dtos for Product HS code search response
  public static class ProductSearchResponse {
    public String query;

    public List<Result> results;

    @JsonProperty("search_timestamp")
    public String searchTimestamp;

    @JsonProperty("total_results")
    public Integer totalResults;

    @Override
    public String toString() {
      return "ProductSearchResponse{query='%s', total_results=%s, results.size=%s}"
          .formatted(query, totalResults, results == null ? 0 : results.size());
    }
  }

  public static class Result {
    public String chapter;

    @JsonProperty("chapter_value")
    public String chapterValue;

    public String heading;

    @JsonProperty("heading_value")
    public String headingValue;

    public Integer rank;
    public Double score;

    @JsonProperty("scores_breakdown")
    public ScoresBreakdown scoresBreakdown;

    public String subheading;

    @JsonProperty("subheading_value")
    public String subheadingValue;
  }

  public static class ScoresBreakdown {
    public Double chapter;
    public Double heading;
    public Double subheading;
  }
}
