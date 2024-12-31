package com.research.culturalmap.cultural_map_explorer.dto.login;

import com.research.culturalmap.cultural_map_explorer.model.User;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/**
 * Represents a detailed response for a login request, including a JWT token, user details, and a timestamp.
 */
public record LoginResponse(
        @NotBlank(message = "JWT token cannot be blank.")
        String jwtToken,

        @NotNull(message = "User details cannot be null.")
        User user,

        @NotNull(message = "Timestamp cannot be null.")
        Instant timestamp,

        @NotBlank(message = "Status cannot be blank.")
        String status
) { }