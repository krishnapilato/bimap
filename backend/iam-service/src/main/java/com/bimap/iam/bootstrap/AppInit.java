package com.bimap.iam.bootstrap;

import com.bimap.iam.modules.auth.service.RegistrationService;
import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.AuthProvider;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.repository.UserAccountRepository;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/// Loads the founding accounts from `seed/users.json` on first start.
///
/// Re-running is free: addresses that already exist are skipped, and whatever is left is written
/// in one batch. With no seed password configured the accounts are created pending activation and
/// each person sets their own password from the emailed link, which is the only sane behaviour
/// in production.
///
/// @author Khova Krishna Pilato
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "bimap.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AppInit implements ApplicationRunner {

    private final UserAccountRepository accounts;
    private final RegistrationService registrationService;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final SeedProperties properties;

    /// @param enabled  Set false to skip seeding entirely.
    /// @param location Classpath or file location of the seed document.
    /// @param password Optional shared password. When absent, seeded accounts are invited instead.
    @ConfigurationProperties(prefix = "bimap.seed")
    public record SeedProperties(
            @DefaultValue("true") boolean enabled,
            @DefaultValue("classpath:seed/users.json") String location,
            String password) {

        public boolean hasPassword() {
            return password != null && !password.isBlank();
        }
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        var seeds = read();
        if (seeds.isEmpty()) {
            return;
        }

        Set<String> known = accounts.findAll().stream()
                .map(account -> account.getEmail().toLowerCase(java.util.Locale.ROOT))
                .collect(java.util.stream.Collectors.toUnmodifiableSet());

        var missing = seeds.stream().filter(seed -> !known.contains(seed.email())).toList();
        if (missing.isEmpty()) {
            log.info("Seed accounts already present, nothing to do");
            return;
        }

        var created = accounts.saveAll(missing.stream().map(this::toAccount).toList());

        if (!properties.hasPassword()) {
            created.forEach(registrationService::sendActivationLink);
        }
        log.info("Seeded {} account(s) as {}", created.size(),
                properties.hasPassword() ? "active" : "pending activation");
    }

    private List<SeedUser> read() throws IOException {
        var resource = resourceLoader.getResource(properties.location());
        if (!resource.exists()) {
            log.info("No seed document at {}, skipping", properties.location());
            return List.of();
        }
        try (InputStream json = resource.getInputStream()) {
            return List.of(objectMapper.readValue(json, SeedUser[].class));
        }
    }

    private UserAccount toAccount(SeedUser seed) {
        var now = Instant.now();
        var active = properties.hasPassword();

        return UserAccount.builder()
                .firstName(seed.firstName())
                .lastName(seed.lastName())
                .email(seed.email())
                .role(seed.role())
                .authProvider(AuthProvider.LOCAL)
                .passwordHash(active ? passwordEncoder.encode(properties.password()) : null)
                .status(active ? AccountStatus.ACTIVE : AccountStatus.PENDING_ACTIVATION)
                .activatedAt(active ? now : null)
                .passwordChangedAt(active ? now : null)
                .build();
    }
}
