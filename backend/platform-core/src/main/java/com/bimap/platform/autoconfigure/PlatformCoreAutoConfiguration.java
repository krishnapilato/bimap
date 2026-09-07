package com.bimap.platform.autoconfigure;

import com.bimap.platform.error.ProblemDetailFactory;
import com.bimap.platform.error.RestExceptionHandler;
import com.bimap.platform.security.JwtProperties;
import com.bimap.platform.security.JwtService;
import com.bimap.platform.web.CorrelationIdFilter;
import com.bimap.platform.web.LandingController;
import com.bimap.platform.web.PlatformProperties;
import com.bimap.platform.web.PlatformStatusController;
import com.bimap.platform.web.RuntimeMetricsService;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.info.BuildProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;

import java.util.Map;

/// Registers the shared kernel in whichever service is starting.
/// @author Khova Krishna Pilato
@AutoConfiguration
@EnableConfigurationProperties({PlatformProperties.class, JwtProperties.class})
public class PlatformCoreAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public ProblemDetailFactory problemDetailFactory() {
        return new ProblemDetailFactory();
    }

    @Bean
    @ConditionalOnMissingBean
    public RestExceptionHandler restExceptionHandler(ProblemDetailFactory problems) {
        return new RestExceptionHandler(problems);
    }

    @Bean
    @ConditionalOnMissingBean
    public CorrelationIdFilter correlationIdFilter() {
        return new CorrelationIdFilter();
    }

    @Bean
    @ConditionalOnMissingBean
    public JwtService jwtService(JwtProperties properties) {
        return new JwtService(properties);
    }

    @Bean
    @ConditionalOnMissingBean
    public RuntimeMetricsService runtimeMetricsService(MeterRegistry meters,
                                                       Environment environment,
                                                       PlatformProperties platform,
                                                       ObjectProvider<Map<String, HealthIndicator>> healthIndicators,
                                                       ObjectProvider<BuildProperties> buildProperties) {
        return new RuntimeMetricsService(meters, environment, platform,
                healthIndicators.getIfAvailable(Map::of), buildProperties.getIfAvailable());
    }

    @Bean
    @ConditionalOnMissingBean
    public LandingController landingController(PlatformProperties platform, RuntimeMetricsService metrics) {
        return new LandingController(platform, metrics);
    }

    @Bean
    @ConditionalOnMissingBean
    public PlatformStatusController platformStatusController(RuntimeMetricsService metrics) {
        return new PlatformStatusController(metrics);
    }
}
