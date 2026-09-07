package com.bimap.platform.security;

/// What a signed token is allowed to be used for.
/// @author Khova Krishna Pilato
public enum TokenType {

    /// Short-lived bearer token presented on every API call.
    ACCESS,

    /// Long-lived token exchanged for a new access token, and only that.
    REFRESH,

    /// Single-use token embedded in the activation email.
    ACTIVATION,

    /// Single-use token embedded in the password-reset email.
    PASSWORD_RESET;

    public String claimValue() {
        return name().toLowerCase(java.util.Locale.ROOT);
    }
}
