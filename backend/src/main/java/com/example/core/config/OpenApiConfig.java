package com.example.core.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {

        var info = new Info().title("Bimap API").version("1.0.0").description("Spring Boot REST API");

        var securityScheme = new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT");

        var components = new Components().addSecuritySchemes(SECURITY_SCHEME, securityScheme);

        var securityRequirement = new SecurityRequirement().addList(SECURITY_SCHEME);

        return new OpenAPI().info(info).components(components).addSecurityItem(securityRequirement);
    }
}