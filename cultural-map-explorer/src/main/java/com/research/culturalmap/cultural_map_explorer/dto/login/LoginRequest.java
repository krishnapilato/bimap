package com.research.culturalmap.cultural_map_explorer.dto.login;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Represents a login request with a username and password, including validation.
 */
public record LoginRequest(
        @NotBlank(message = "Username cannot be blank.")
        @Size(max = 50, message = "Username must not exceed 50 characters.")
        String username,

        @NotBlank(message = "Password cannot be blank.")
        @Size(min = 8, message = "Password must be at least 8 characters long.")
        String password
) { }