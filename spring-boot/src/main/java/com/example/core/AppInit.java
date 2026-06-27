package com.example.core;

import com.example.beans.User;
import com.example.enums.ApplicationRole;
import com.example.enums.UserStatus;
import com.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class AppInit implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        var now = Instant.now();

        List<User> users = List.of(admin(now), user("Test2", "test.test2@gmail.com", ApplicationRole.ADMINISTRATOR, UserStatus.CONFIRMED, "JRU8sE4u3755xBsw", now), user("Test3", "test.test3@gmail.com", ApplicationRole.USER, UserStatus.NOT_CONFIRMED, "J4evnj6ZKqLHJPFA", now), user("Test4", "test.test4@gmail.com", ApplicationRole.USER, UserStatus.CONFIRMED, "FNFr6JbgPhMbxa2U", now), user("Test5", "test.test5@gmail.com", ApplicationRole.MANAGER, UserStatus.NOT_CONFIRMED, "TSPyv7HL7RGwHnMf", now));

        users.forEach(this::saveIfMissing);
    }

    private User admin(Instant now) {
        return user("Khova Krishna", "krishnak.pilato@gmail.com", ApplicationRole.ADMINISTRATOR, UserStatus.CONFIRMED, "CIAOO", now);
    }

    private User user(String name, String email, ApplicationRole role, UserStatus status, String key, Instant now) {
        var u = new User();
        u.setName(name);
        u.setSurname(name);
        u.setEmail(email);
        u.setCreated(now);
        u.setLastModified(now);
        u.setPassword(passwordEncoder.encode("12345678"));
        u.setUserStatus(status);
        u.setApplicationRole(role);
        u.setKey(key);
        return u;
    }

    private void saveIfMissing(User user) {
        if (userRepository.findByEmailAddress(user.getEmail()).isEmpty()) {
            userRepository.save(user);
        }
    }
}