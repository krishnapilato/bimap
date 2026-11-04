package com.bimap.service;

import module java.base;

import com.bimap.core.MailService.Email;
import com.bimap.model.User;
import com.bimap.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

@Service
@Transactional
public class UserService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String frontendUrl;

    public UserService(UserRepository users, PasswordEncoder passwordEncoder,
                       @Value("${app.frontend-url:http://localhost:4200}") String frontendUrl) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.frontendUrl = frontendUrl;
    }

    @Transactional(readOnly = true)
    public List<User> findAll() {
        return users.findAll();
    }

    @Transactional(readOnly = true)
    public boolean exists(String email) {
        return users.existsByEmail(email);
    }

    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        return users.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }

    public User create(String name, String surname, String email, String password, User.Role role, boolean enabled) {
        if (users.existsByEmail(email)) throw emailInUse();

        var user = new User(name, surname, email, passwordEncoder.encode(password), role);
        user.setEnabled(enabled);
        return users.save(user);
    }

    public User update(long id, String name, String surname, String email, String password, User.Role role, Boolean enabled) {
        var user = find(id);
        if (!user.getEmail().equalsIgnoreCase(email) && users.existsByEmail(email)) throw emailInUse();

        user.setName(name);
        user.setSurname(surname);
        user.setEmail(email);
        user.setRole(role);
        if (enabled != null) user.setEnabled(enabled);
        if (password != null && !password.isBlank()) user.setPassword(passwordEncoder.encode(password));
        return user;
    }

    public void delete(long id) {
        users.delete(find(id));
    }

    @Transactional(readOnly = true)
    public Email welcomeEmail(long id) {
        var user = find(id);
        var html = """
                <h1>Hi %s!</h1>
                <p>An account with the role <b>%s</b> was created for you on BiMap.</p>
                <p><a href="%s">Sign in</a> with this email address and the password your administrator gave you.</p>
                """.formatted(HtmlUtils.htmlEscape(user.getName()), user.getRole().name().toLowerCase(Locale.ROOT), HtmlUtils.htmlEscape(frontendUrl));
        return new Email(user.getEmail(), "Your BiMap account", html);
    }

    private User find(long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }

    private static ResponseStatusException emailInUse() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use.");
    }
}
