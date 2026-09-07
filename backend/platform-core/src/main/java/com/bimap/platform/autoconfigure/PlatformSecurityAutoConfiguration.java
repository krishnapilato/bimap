package com.bimap.platform.autoconfigure;

import com.bimap.platform.error.ProblemDetailFactory;
import com.bimap.platform.security.JwtAuthenticationFilter;
import com.bimap.platform.security.JwtService;
import com.bimap.platform.security.ProblemAccessDeniedHandler;
import com.bimap.platform.security.ProblemAuthenticationEntryPoint;
import com.bimap.platform.security.ProblemResponseWriter;
import com.bimap.platform.web.PlatformProperties;
import tools.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/// Security building blocks every service assembles into its own filter chain.
/// @author Khova Krishna Pilato
@AutoConfiguration(after = PlatformCoreAutoConfiguration.class)
public class PlatformSecurityAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService) {
        return new JwtAuthenticationFilter(jwtService);
    }

    /// The filter belongs to the security chain only; this keeps the servlet container from
    /// registering it a second time.
    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtAuthenticationFilterRegistration(
            JwtAuthenticationFilter filter) {
        var registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    @ConditionalOnMissingBean
    public ProblemResponseWriter problemResponseWriter(ObjectMapper objectMapper) {
        return new ProblemResponseWriter(objectMapper);
    }

    @Bean
    @ConditionalOnMissingBean
    public ProblemAuthenticationEntryPoint problemAuthenticationEntryPoint(ProblemDetailFactory problems,
                                                                          ProblemResponseWriter writer) {
        return new ProblemAuthenticationEntryPoint(problems, writer);
    }

    @Bean
    @ConditionalOnMissingBean
    public ProblemAccessDeniedHandler problemAccessDeniedHandler(ProblemDetailFactory problems,
                                                                 ProblemResponseWriter writer) {
        return new ProblemAccessDeniedHandler(problems, writer);
    }

    @Bean
    @ConditionalOnMissingBean
    public CorsConfigurationSource corsConfigurationSource(PlatformProperties platform) {
        var cors = new CorsConfiguration();
        cors.setAllowedOrigins(platform.corsOrigins());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Correlation-Id"));
        cors.setExposedHeaders(List.of("X-Correlation-Id"));
        cors.setAllowCredentials(true);
        cors.setMaxAge(3600L);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }
}
