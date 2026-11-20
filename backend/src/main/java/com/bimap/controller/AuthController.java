package com.bimap.controller;

import module java.base;

import com.bimap.core.LoginAttempts;
import com.bimap.model.User;
import com.bimap.service.UserService;
import com.bimap.validation.BcryptSize;
import com.bimap.validation.EmailAddress;
import com.bimap.validation.PersonName;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;

@RestController
@RequestMapping("/auth")
@SecurityRequirements
public class AuthController {

    private static final Duration TOKEN_VALIDITY = Duration.ofHours(10);

    private final UserService users;
    private final JwtEncoder jwtEncoder;
    private final LoginAttempts loginAttempts;

    public AuthController(UserService users, JwtEncoder jwtEncoder, LoginAttempts loginAttempts) {
        this.users = users;
        this.jwtEncoder = jwtEncoder;
        this.loginAttempts = loginAttempts;
    }

    record LoginRequest(@NotBlank @EmailAddress String email, @NotBlank @Size(max = 72) @BcryptSize String password) { }

    record SignupRequest(
            @NotBlank @PersonName String name,
            @NotBlank @PersonName String surname,
            @NotBlank @EmailAddress String email,
            @NotBlank @Size(min = 8, max = 72) @BcryptSize String password) { }

    record UserView(Long id, String name, String surname, String email, User.Role role) { }

    record LoginResponse(String token, UserView user) { }

    @PostMapping("/login")
    LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        var attempt = loginAttempts.reserve(http.getRemoteAddr());
        var user = users.authenticate(request.email(), request.password());
        attempt.succeeded();
        return responseFor(user);
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    LoginResponse signup(@Valid @RequestBody SignupRequest request, HttpServletRequest http) {
        loginAttempts.reserve(http.getRemoteAddr());
        return responseFor(users.create(request.name(), request.surname(), request.email(), request.password(), User.Role.USER, true));
    }

    private LoginResponse responseFor(User user) {
        return new LoginResponse(tokenFor(user), new UserView(user.getId(), user.getName(), user.getSurname(), user.getEmail(), user.getRole()));
    }

    private String tokenFor(User user) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .subject(user.getId().toString())
                .claim("ver", Long.toString(user.getTokenVersion()))
                .issuedAt(now)
                .expiresAt(now.plus(TOKEN_VALIDITY))
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
