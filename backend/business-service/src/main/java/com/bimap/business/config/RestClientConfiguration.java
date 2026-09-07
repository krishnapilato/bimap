package com.bimap.business.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;

/// One `RestClient` per upstream, each with its own timeouts.
///
/// Timeouts are the point: a public API that stops answering must not hold one of our request
/// threads open indefinitely, and the three upstreams have different tolerances.
///
/// @author Khova Krishna Pilato
@Configuration
@RequiredArgsConstructor
public class RestClientConfiguration {

    private final IntegrationProperties integration;

    @Bean
    public RestClient comuniItaRestClient(RestClient.Builder builder) {
        return build(builder, integration.comuniIta());
    }

    @Bean
    public RestClient nominatimRestClient(RestClient.Builder builder) {
        return build(builder, integration.nominatim());
    }

    @Bean
    public RestClient codiceUnivocoRestClient(RestClient.Builder builder) {
        return build(builder, integration.codiceUnivoco());
    }

    private RestClient build(RestClient.Builder builder, IntegrationProperties.Upstream upstream) {
        var httpClient = HttpClient.newBuilder()
                .connectTimeout(upstream.connectTimeout())
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();

        var requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(upstream.readTimeout());

        return builder.clone()
                .baseUrl(upstream.baseUrl())
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.USER_AGENT, integration.userAgent())
                .defaultHeader(HttpHeaders.ACCEPT, "application/json")
                .build();
    }
}
