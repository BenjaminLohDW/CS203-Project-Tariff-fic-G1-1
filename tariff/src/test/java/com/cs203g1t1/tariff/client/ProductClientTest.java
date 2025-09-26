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
import org.springframework.http.HttpHeaders;
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
    "product.base-url=http://localhost:5002",
    "product.lookup-path=/api/v1/hs-code/lookup"
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
    void getHsCodeByProductName_success_returnsHsCode() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/lookup";
        String responseJson =
            "{\n" +
            "  \"description\": \"Smartphones (NMB)\",\n" +
            "  \"error_message\": null,\n" +
            "  \"hs_code\": \"85171300\",\n" +
            "  \"query\": \"smartphone\",\n" +
            "  \"response_time_ms\": 24524,\n" +
            "  \"success\": true,\n" +
            "  \"suggestions\": [],\n" +
            "  \"unit_of_measure\": \"NMB\"\n" +
            "}";

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.POST))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(content().json("{\"query\":\"smartphone\"}"))
              .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        String hs = productClient.getHsCodeByProductName("smartphone");

        assertThat(hs).isEqualTo("85171300");
        server.verify();
    }

    @Test
    void getHsCodeByProductName_notFound_throws() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/lookup";

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
    void getHsCodeByProductName_successFalse_throws() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/lookup";
        String responseJson =
            "{\n" +
            "  \"success\": false,\n" +
            "  \"error_message\": \"No results\"\n" +
            "}";

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.POST))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(content().json("{\"query\":\"bad\"}"))
              .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        assertThrows(RuntimeException.class,
            () -> productClient.getHsCodeByProductName("bad"));

        server.verify();
    }

    @Test
    void getHsCodeByProductName_missingHsCode_throws() {
        String expectedUrl = "http://localhost:5002/api/v1/hs-code/lookup";
        String responseJson =
            "{\n" +
            "  \"success\": true,\n" +
            "  \"description\": \"something\",\n" +
            "  \"query\": \"x\"\n" +
            "}";

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.POST))
              .andExpect(content().contentType(MediaType.APPLICATION_JSON))
              .andExpect(content().json("{\"query\":\"x\"}"))
              .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        assertThrows(RuntimeException.class,
            () -> productClient.getHsCodeByProductName("x"));

        server.verify();
    }
}
