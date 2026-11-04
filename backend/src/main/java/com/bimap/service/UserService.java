package com.bimap.service;

import module java.base;

import com.bimap.core.MailService.Email;
import com.bimap.model.User;
import com.bimap.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
    private final AuthenticationManager authenticationManager;

    public UserService(UserRepository users, PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, @Value("${app.frontend-url:http://localhost:4200}") String frontendUrl) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
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

    public User authenticate(String email, String password) {
        // The one-connection pool keeps credential verification and account loading in one transaction.
        var authenticated = authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, password));
        return find(Long.parseLong(authenticated.getName()));
    }

    public User create(String name, String surname, String email, String password, User.Role role, boolean enabled) {
        if (users.existsByEmail(email)) throw emailInUse();

        var user = new User(name, surname, email, passwordEncoder.encode(password), role);
        user.setEnabled(enabled);
        return users.save(user);
    }

    public User update(long id, String name, String surname, String email, String password, User.Role role, Boolean enabled) {
        var user = find(id);
        var nextRole = role == null ? user.getRole() : role;
        if (!user.getEmail().equalsIgnoreCase(email) && users.existsByEmail(email)) throw emailInUse();
        if (nextRole != User.Role.ADMINISTRATOR || Boolean.FALSE.equals(enabled)) protectLastAdministrator(user);

        user.setName(name);
        user.setSurname(surname);
        user.setEmail(email);
        user.setRole(nextRole);
        if (enabled != null) user.setEnabled(enabled);
        if (password != null && !password.isBlank()) user.setPassword(passwordEncoder.encode(password));
        return user;
    }

    public void delete(long id) {
        var user = find(id);
        protectLastAdministrator(user);
        users.delete(user);
    }

    public void bootstrapAdministrator(String email, String password) {
        if (users.countByRoleAndEnabledTrueAndLockedFalse(User.Role.ADMINISTRATOR) > 0) return;
        create("Administrator", "BiMap", email, password, User.Role.ADMINISTRATOR, true);
    }

    private void protectLastAdministrator(User user) {
        if (user.getRole() == User.Role.ADMINISTRATOR && user.canSignIn()
                && users.countByRoleAndEnabledTrueAndLockedFalse(User.Role.ADMINISTRATOR) == 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The last active administrator cannot be removed, disabled or demoted.");
        }
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
