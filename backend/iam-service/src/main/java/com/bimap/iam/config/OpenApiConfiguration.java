package com.bimap.iam.config;

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

/// @author Khova Krishna Pilato
@Configuration
public class OpenApiConfiguration {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI iamOpenApi(PlatformProperties platform) {
        return new OpenAPI()
                .info(new Info()
                        .title("BiMap IAM API")
                        .version("2.0.0")
                        .description("""
                                Identity and access management for BiMap: registration and activation,
                                JWT sign-in and refresh, Google sign-in, password recovery, and the
                                account lifecycle.

                                Errors are RFC 7807 problem documents. Every response carries an
                                `X-Correlation-Id` worth quoting in a bug report.
                                """)
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
                        .description("Access token returned by /api/v1/auth/login")));
    }



}
