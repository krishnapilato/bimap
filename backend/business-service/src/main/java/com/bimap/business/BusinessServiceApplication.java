package com.bimap.business;

import com.bimap.business.config.IntegrationProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/// Part two of the platform: the registration domain and the geography behind it.
///
/// It authenticates callers from the token the IAM service signed and never calls that service,
/// so the two deploy and scale on their own.
///
/// @author Khova Krishna Pilato
@SpringBootApplication
@EnableConfigurationProperties(IntegrationProperties.class)
public class BusinessServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(BusinessServiceApplication.class, args);
    }
}
