package com.cs203g1t1.tariff.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

@SpringBootTest(classes = {
    ProductClientTest.TestConfig.class,
    ProductClient.class
})
@TestPropertySource(properties = {
    // NOTE: property names align with ProductClient's @Value("${product.baseUrl}") etc.
    "product.baseUrl=http://localhost:5002",
    "product.lookup-path=/api/v1/hs-code/search"
})
class ProductClientTest {

    @Configuration
    static class TestConfig {
        @Bean
        RestTemplate restTemplate() {
            return new RestTemplate();
        }
    }

    @Autowired
    RestTemplate restTemplate;

    @Autowired
    ProductClient productClient;

    MockRestServiceServer server;

    @BeforeEach
    void setup() {
        server = MockRestServiceServer.createServer(restTemplate);
    }

    @Test
    void getHsCodeByProductName_success_returnsDotlessHsCode() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/search";
        String responseJson = """
            {
              "query": "smartphone",
              "results": [
                {
                  "chapter": "85",
                  "chapter_value": "Electrical machinery and equipment and parts thereof;",
                  "heading": "85.17",
                  "heading_value": "Telephone sets, including smartphones and other telephones for",
                  "rank": 1,
                  "score": 0.5809,
                  "scores_breakdown": { "chapter": 0.3983, "heading": 0.6020, "subheading": 0.6010 },
                  "subheading": "8517.13",
                  "subheading_value": "Smartphones"
                }
              ],
              "search_timestamp": "2025-10-18T08:30:38.311379",
              "total_results": 1
            }
            """;

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.POST))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(content().json("{\"query\":\"smartphone\"}"))
              .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        String hs = productClient.getHsCodeByProductName("smartphone");

        // Client should strip dots: "8517.13" -> "851713"
        assertThat(hs).isEqualTo("851713");
        server.verify();
    }

    @Test
    void getHsCodeByProductName_httpNotFound_throws() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/search";

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.POST))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(content().json("{\"query\":\"ghost-item\"}"))
              .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThrows(RuntimeException.class,
            () -> productClient.getHsCodeByProductName("ghost-item"));

        server.verify();
    }

    @Test
    void getHsCodeByProductName_emptyResults_throws() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/search";
        String responseJson = """
            {
              "query": "nothing",
              "results": [],
              "search_timestamp": "2025-10-18T08:30:38.311379",
              "total_results": 0
            }
            """;

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.POST))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(content().json("{\"query\":\"nothing\"}"))
              .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        assertThrows(RuntimeException.class,
            () -> productClient.getHsCodeByProductName("nothing"));

        server.verify();
    }

    @Test
    void getHsCodeByProductName_missingSubheading_throws() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/search";
        String responseJson = """
            {
              "query": "bad",
              "results": [
                {
                  "rank": 1,
                  "score": 0.1,
                  "subheading": ""
                }
              ],
              "search_timestamp": "2025-10-18T08:30:38.311379",
              "total_results": 1
            }
            """;

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.POST))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(content().json("{\"query\":\"bad\"}"))
              .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        assertThrows(RuntimeException.class,
            () -> productClient.getHsCodeByProductName("bad"));

        server.verify();
    }
}
