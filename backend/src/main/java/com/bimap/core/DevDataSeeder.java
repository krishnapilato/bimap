package com.bimap.core;

import com.bimap.model.User;
import com.bimap.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class DevDataSeeder {

    private final UserService users;
    private final String defaultPassword;

    public DevDataSeeder(UserService users, @Value("${app.seed.default-password:12345678}") String defaultPassword) {
        this.users = users;
        this.defaultPassword = defaultPassword;
    }

    @EventListener(ApplicationReadyEvent.class)
    void seedUsers() {
        seed("Khova Krishna", "Pilato", "krishnak.pilato@gmail.com", User.Role.ADMINISTRATOR, true);
        seed("Giulia", "Rossi", "giulia.rossi@bimap.com", User.Role.ADMINISTRATOR, true);
        seed("Arjun", "Sharma", "arjun.sharma@bimap.com", User.Role.USER, false);
        seed("Marco", "Bianchi", "marco.bianchi@bimap.com", User.Role.USER, true);
        seed("Priya", "Iyer", "priya.iyer@bimap.com", User.Role.MANAGER, false);
    }

    private void seed(String name, String surname, String email, User.Role role, boolean enabled) {
        if (!users.exists(email)) users.create(name, surname, email, defaultPassword, role, enabled);
    }
}
