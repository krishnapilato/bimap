package com.example.core;

import com.example.model.User;
import com.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@RequiredArgsConstructor
public class AppInit {

    private static final String DEFAULT_PASSWORD = "12345678";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    void seedUsers() {
        seed("Khova Krishna", "Pilato", "krishnak.pilato@gmail.com", User.Role.ADMINISTRATOR, true);
        seed("Giulia", "Rossi", "giulia.rossi@example.com", User.Role.ADMINISTRATOR, true);
        seed("Arjun", "Sharma", "arjun.sharma@example.com", User.Role.USER, false);
        seed("Marco", "Bianchi", "marco.bianchi@example.com", User.Role.USER, true);
        seed("Priya", "Iyer", "priya.iyer@example.com", User.Role.MANAGER, false);
    }

    private void seed(String name, String surname, String email, User.Role role, boolean enabled) {
        if (users.existsByEmail(email)) return;
        var user = new User();
        user.setName(name);
        user.setSurname(surname);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
        user.setRole(role);
        user.setEnabled(enabled);
        users.save(user);
    }
}