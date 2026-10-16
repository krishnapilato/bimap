package com.example.controller;

import module java.base;

import com.example.core.MailService;
import com.example.model.User;
import com.example.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    record UserRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 100) String surname,
            @NotBlank @Email @Size(max = 256) String email,
            @Size(min = 8, max = 128) String password,
            User.Role role,
            Boolean enabled) { }

    record UserView(Long id, String name, String surname, String email, User.Role role, boolean enabled) {
        static UserView of(User user) {
            return new UserView(user.getId(), user.getName(), user.getSurname(), user.getEmail(), user.getRole(), user.isEnabled());
        }
    }

    @GetMapping
    List<UserView> findAll() {
        return users.findAll().stream().map(UserView::of).toList();
    }

    @GetMapping("/exists")
    boolean exists(@RequestParam @Email String email) {
        return users.existsByEmail(email);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    UserView create(@Valid @RequestBody UserRequest request) {
        if (request.password() == null || request.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        }
        if (users.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use.");
        }
        var user = new User();
        apply(request, user);
        return UserView.of(users.save(user));
    }

    @PutMapping("/{id}")
    UserView update(@PathVariable Long id, @Valid @RequestBody UserRequest request) {
        var user = find(id);
        if (!user.getEmail().equals(request.email()) && users.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use.");
        }
        apply(request, user);
        return UserView.of(users.save(user));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id) {
        users.delete(find(id));
    }

    @PostMapping("/{id}/welcome-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void sendWelcomeEmail(@PathVariable Long id) throws MessagingException {
        var user = find(id);
        var html = """
                <h1>Hi %s!</h1>
                <p>An account with the role <b>%s</b> was created for you on BiMap.</p>
                <p><a href="%s">Sign in</a> with this email address and the password your administrator gave you.</p>
                """.formatted(HtmlUtils.htmlEscape(user.getName()), user.getRole().name().toLowerCase(), frontendUrl);
        mailService.send(user.getEmail(), "Your BiMap account", html);
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private void apply(UserRequest request, User user) {
        user.setName(request.name());
        user.setSurname(request.surname());
        user.setEmail(request.email());
        user.setRole(request.role() == null ? User.Role.USER : request.role());
        if (request.enabled() != null) {
            user.setEnabled(request.enabled());
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }
    }
}
