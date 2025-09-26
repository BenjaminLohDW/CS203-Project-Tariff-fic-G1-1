package com.cs203g1t1.tariff.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

@SpringBootTest(classes = {
    CountryClientTest.TestConfig.class,
    CountryClient.class
})
@TestPropertySource(properties = {
    "country.base-url=http://localhost:5005",
    "country.by-name-path=/api/countries/by-name"
})
class CountryClientTest {

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
    CountryClient countryClient;

    MockRestServiceServer server;

    @BeforeEach
    void setup() {
        server = MockRestServiceServer.createServer(restTemplate);
    }

    @Test
    void getCountryIdByName_success_returnsIsoCode() {
        String expectedUrl = "http://localhost:5005/api/countries/by-name?name=Singapore";

        String body = "{\n"
            + "  \"code\": 200,\n"
            + "  \"data\": {\n"
            + "    \"code\": \"SG\",\n"
            + "    \"country_id\": 153,\n"
            + "    \"name\": \"Singapore\"\n"
            + "  }\n"
            + "}";

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.GET))
              .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));

        String code = countryClient.getCountryIdByName("Singapore");

        assertThat(code).isEqualTo("SG");
        server.verify();
    }

    @Test
    void getCountryIdByName_notFound_returnsNull_orThrows() {
        String expectedUrl = "http://localhost:5005/api/countries/by-name?name=Neverland";

        server.expect(requestTo(expectedUrl))
              .andExpect(method(HttpMethod.GET))
              .andRespond(withStatus(HttpStatus.NOT_FOUND));

        // Choose ONE of the two assertions below based on your CountryClient behavior:

        // (A) If your CountryClient returns null on 404:
        // String code = countryClient.getCountryCodeByName("Neverland");
        // assertThat(code).isNull();

        // (B) If your CountryClient throws (e.g., RuntimeException) on 404:
        assertThrows(RuntimeException.class, () -> countryClient.getCountryIdByName("Neverland"));

        server.verify();
    }
}
