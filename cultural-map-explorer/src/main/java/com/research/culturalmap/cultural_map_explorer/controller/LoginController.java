package com.research.culturalmap.cultural_map_explorer.controller;


import com.research.culturalmap.cultural_map_explorer.config.security.JwtUtils;
import com.research.culturalmap.cultural_map_explorer.dto.login.LoginRequest;
import com.research.culturalmap.cultural_map_explorer.dto.login.LoginResponse;
import com.research.culturalmap.cultural_map_explorer.model.User;
import com.research.culturalmap.cultural_map_explorer.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
@RequestMapping("/auth")
public class LoginController {

    // Security Objects

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtUtils jwtTokenUtil;

    // JPA Repository

    @Autowired
    private UserRepository userRepository;

    // POST Mapping to create authentication token

    @PostMapping("/login")
    public String createAuthenticationToken(@RequestBody LoginRequest loginRequest) {
        try {
            // Authenticate the user credentials
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.username(),
                            loginRequest.password()
                    )
            );

            // Fetch user details from the repository
            User user = this.userRepository.findByEmail(loginRequest.username())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + loginRequest.username()));

            // Debugging Step: Print user details
            System.out.println("Authenticated user: " + user);

            return "Hello,";
        } catch (Exception e) {
            // Debugging Step: Print error details
            e.printStackTrace();

            return "Authentication failed: " + e.getMessage();
        }
    }
}