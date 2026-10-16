package com.example.core;

import io.swagger.v3.oas.annotations.ExternalDocumentation;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "BiMap API",
                version = "1.0.0",
                description = "Register Italian heritage assets on a map. Sign in at POST /auth/login, then send the token as a Bearer header.",
                contact = @Contact(
                        name = "Khova Krishna Pilato",
                        email = "krishnak.pilato@gmail.com",
                        url = "https://github.com/krishnapilato")),
        externalDocs = @ExternalDocumentation(
                description = "Source code on GitHub",
                url = "https://github.com/krishnapilato/bimap"),
        security = @SecurityRequirement(name = "bearerAuth"))
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig { }
