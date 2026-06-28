package com.example.core;

import com.example.beans.User;
import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;
import com.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@Profile({"dev", "local"})
@RequiredArgsConstructor
public class AppInit implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Running database initialization sequence...");

        final var now = Instant.now();
        final String defaultPassword = passwordEncoder.encode("12345678");

        var seedUsers = List.of(
                createAdmin(now, defaultPassword),
                createUser("Test2", "Surname2", "test.test2@gmail.com", ApplicationRole.ADMINISTRATOR, UserStatus.CONFIRMED, "JRU8sE4u3755xBsw", now, defaultPassword),
                createUser("Test3", "Surname3", "test.test3@gmail.com", ApplicationRole.USER, UserStatus.NOT_CONFIRMED, "J4evnj6ZKqLHJPFA", now, defaultPassword),
                createUser("Test4", "Surname4", "test.test4@gmail.com", ApplicationRole.USER, UserStatus.CONFIRMED, "FNFr6JbgPhMbxa2U", now, defaultPassword),
                createUser("Test5", "Surname5", "test.test5@gmail.com", ApplicationRole.MANAGER, UserStatus.NOT_CONFIRMED, "TSPyv7HL7RGwHnMf", now, defaultPassword)
        );

        var usersToInsert = seedUsers.stream()
                .filter(u -> userRepository.findByEmailAddress(u.getEmail()).isEmpty())
                .toList();

        if (!usersToInsert.isEmpty()) {
            userRepository.saveAll(usersToInsert);
            log.info("Successfully seeded {} new users.", usersToInsert.size());
        } else {
            log.info("Database already initialized. No new users added.");
        }
    }

    private User createAdmin(Instant now, String encodedPassword) {
        return createUser(
                "Khova Krishna", "Pilato", "krishnak.pilato@gmail.com",
                ApplicationRole.ADMINISTRATOR, UserStatus.CONFIRMED, "CIAOO", now, encodedPassword
        );
    }

    private User createUser(String name, String surname, String email, ApplicationRole role, UserStatus status, String key, Instant now, String encodedPassword) {
        var user = new User();
        user.setName(name);
        user.setSurname(surname);
        user.setEmail(email);
        user.setCreated(now);
        user.setLastModified(now);
        user.setPassword(encodedPassword);
        user.setUserStatus(status);
        user.setApplicationRole(role);
        user.setKey(key);
        return user;
    }
}