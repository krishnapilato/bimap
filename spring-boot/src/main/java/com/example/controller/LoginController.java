package com.example.controller;

import com.example.beans.login.LoginRequest;
import com.example.beans.login.LoginResponse;
import com.example.core.security.JwtUtils;
import com.example.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@CrossOrigin
@RequiredArgsConstructor
public class LoginController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        } catch (AuthenticationException ex) {
            throw new UsernameNotFoundException("Invalid credentials");
        }

        var user = userRepository.findByEmailAddress(request.username()).orElseThrow(() -> new UsernameNotFoundException("User not found: " + request.username()));

        var token = jwtUtils.generateToken(user);

        return new LoginResponse(token, user);
    }
}