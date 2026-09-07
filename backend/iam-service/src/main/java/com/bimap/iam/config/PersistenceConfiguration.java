package com.bimap.iam.config;

import com.bimap.platform.context.CurrentRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Optional;

/// @author Khova Krishna Pilato
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class PersistenceConfiguration {

    /// Reads the caller from the scoped request context rather than the security context, so
    /// auditing keeps working on virtual threads and inside async work.
    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.of(CurrentRequest.userEmail().orElse("system"));
    }
}
