package com.bimap.business.config;

import com.bimap.platform.web.PlatformProperties;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.stream.Collectors;

/// @author Khova Krishna Pilato
@Configuration
public class OpenApiConfiguration {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI businessOpenApi(PlatformProperties platform) {
        return new OpenAPI()
                .info(new Info()
                        .title("BiMap Business Core API")
                        .version("2.0.0")
                        .description(description(platform))
                        .contact(new Contact()
                                .name("Khova Krishna Pilato")
                                .email("krishnak.pilato@gmail.com")
                                .url("https://github.com/krishnapilato"))
                        .license(new License().name("Proprietary").url(platform.repositoryUrl())))
                .servers(List.of(new Server().url("/").description("This service")))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Access token issued by the IAM service")));
    }

    /// The credits are built from configuration rather than hard-coded, so the landing page and
    /// this document always name the same sources.
    private static String description(PlatformProperties platform) {
        var credits = platform.attributions().stream()
                .map(source -> "- [%s](%s) — %s%s".formatted(source.name(), source.url(), source.provides(),
                        source.licence() == null ? "" : " (" + source.licence() + ")"))
                .collect(Collectors.joining("\n"));

        return """
                Asset registrations and the Italian geography behind them.

                The geography endpoints form a guided cascade: region narrows province, province
                narrows municipality, municipality narrows the street, the street narrows the
                postcode, and the municipality narrows the responsible public body. Every filter
                is optional, so each endpoint also works on its own.

                Authentication is the access token issued by the IAM service. This service
                verifies it locally and never calls back.

                Errors are RFC 7807 problem documents, and every response carries an
                `X-Correlation-Id`.

                ### Data sources

                The geographic and public-body data served here is not ours. It comes from these
                projects, and this API would not exist without them:

                %s
                """.formatted(credits);
    }



}
