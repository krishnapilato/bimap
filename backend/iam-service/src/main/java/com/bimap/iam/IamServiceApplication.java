package com.bimap.iam;

import com.bimap.iam.bootstrap.AppInit;
import com.bimap.iam.config.AuthProperties;
import com.bimap.iam.modules.notification.service.MailProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/// Part one of the platform: identity, access, and the transactional email that goes with them.
///
/// Nothing here knows anything about cadastral registration, so the module lifts out whole into a
/// new project as a ready-made IAM starter.
///
/// @author Khova Krishna Pilato
@SpringBootApplication
@EnableConfigurationProperties({AuthProperties.class, MailProperties.class, AppInit.SeedProperties.class})
public class IamServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IamServiceApplication.class, args);
    }
}
