package com.bimap.business.config;

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

    /// Stamps `created_by` and `updated_by` from the token, which is the only place this service
    /// learns who is asking.
    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> Optional.of(CurrentRequest.userEmail().orElse("system"));
    }
}
