package com.bimap.iam.modules.auth.dto;

import com.bimap.iam.modules.user.dto.UserResponse;

/// What a client receives after a successful sign-in, refresh or activation.
/// @author Khova Krishna Pilato
public record AuthenticatedSession(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UserResponse user) {

    public static AuthenticatedSession bearer(String accessToken, String refreshToken, long expiresIn, UserResponse user) {
        return new AuthenticatedSession(accessToken, refreshToken, "Bearer", expiresIn, user);
    }
}
