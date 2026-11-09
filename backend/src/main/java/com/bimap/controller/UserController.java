package com.bimap.controller;

import module java.base;

import com.bimap.core.MailService;
import com.bimap.model.User;
import com.bimap.validation.BcryptSize;
import com.bimap.validation.EmailAddress;
import com.bimap.validation.PersonName;
import com.bimap.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService users;
    private final MailService mailService;

    public UserController(UserService users, MailService mailService) {
        this.users = users;
        this.mailService = mailService;
    }

    record UserRequest(@NotBlank @PersonName String name, @NotBlank @PersonName String surname,
                       @NotBlank @EmailAddress String email, @Size(min = 8, max = 72) @BcryptSize String password,
                       User.Role role, Boolean enabled) {

        User.Role roleOrDefault() {
            return role == null ? User.Role.USER : role;
        }
    }

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
    boolean exists(@RequestParam @NotBlank @EmailAddress String email) {
        return users.exists(email);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    UserView create(@Valid @RequestBody UserRequest request) {
        if (request.password() == null || request.password().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required.");
        var enabled = request.enabled() == null || request.enabled();
        return UserView.of(users.create(request.name(), request.surname(), request.email(), request.password(), request.roleOrDefault(), enabled));
    }

    @PutMapping("/{id}")
    UserView update(@PathVariable @Positive long id, @Valid @RequestBody UserRequest request) {
        return UserView.of(users.update(id, request.name(), request.surname(), request.email(), request.password(), request.role(), request.enabled()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable @Positive long id) {
        users.delete(id);
    }

    @PostMapping("/{id}/welcome-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void sendWelcomeEmail(@PathVariable @Positive long id) {
        mailService.send(users.welcomeEmail(id));
    }
}
