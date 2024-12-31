package com.research.culturalmap.cultural_map_explorer.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;

/**
 * Configuration class for setting up Swagger and OpenAPI documentation.
 * Provides metadata and organizes API endpoints into groups for better navigation in the documentation.
 */
@Configuration
public class SwaggerConfig {

    /**
     * Configures the OpenAPI metadata for the application.
     *
     * @return an {@link OpenAPI} object containing metadata such as title, version, contact, and license information.
     */
    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Cultural Map Explorer API")
                        .version("v0.8.5")
                        .description("""
                            This API powers the Cultural Map Explorer application, offering a comprehensive
                            set of endpoints for managing cultural assets, authentication, and more.
                            
                            Key Highlights:
                            - Secure and robust authentication mechanisms
                            - Cultural goods management
                            
                            Explore the documentation to understand available endpoints and their usage.
                            """)
                        .contact(new Contact()
                                .name("Krishna Pilato")
                                .url("https://krishnapilato.github.io/portfolio")
                                .email("krishnak.pilato@gmail.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .addServersItem(new io.swagger.v3.oas.models.servers.Server()
                        .url("http://localhost:8080")
                        .description("Local Development Server"));
    }

    /**
     * Groups API endpoints related to testing functionality.
     *
     * @return a {@link GroupedOpenApi} instance for test-related APIs.
     */
    @Bean
    public GroupedOpenApi testApi() {
        return GroupedOpenApi.builder()
                .group("Test")
                .pathsToMatch("/auth/**")
                .build();
    }
}