package com.example.controller;

import module java.base;

import com.example.model.User;
import com.example.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class LoginController {

    private static final Duration TOKEN_VALIDITY = Duration.ofHours(10);

    private final AuthenticationManager authenticationManager;
    private final UserRepository users;
    private final JwtEncoder jwtEncoder;

    record LoginRequest(@NotBlank @Email String email, @NotBlank String password) { }

    record UserView(Long id, String name, String surname, String email, User.Role role) { }

    record LoginResponse(String token, UserView user) { }

    @PostMapping("/login")
    LoginResponse login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));
        var user = users.findByEmail(request.email()).orElseThrow();
        var view = new UserView(user.getId(), user.getName(), user.getSurname(), user.getEmail(), user.getRole());
        return new LoginResponse(tokenFor(user), view);
    }

    private String tokenFor(User user) {
        var now = Instant.now();
        var claims = JwtClaimsSet.builder()
                .subject(user.getEmail())
                .issuedAt(now)
                .expiresAt(now.plus(TOKEN_VALIDITY))
                .claim("roles", user.getRole().name())
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
