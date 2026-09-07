package com.bimap.platform.error;

import java.io.Serial;

/// Credentials or a token were rejected, or the account is not in a state that permits sign-in.
/// @author Khova Krishna Pilato
public final class AuthenticationFailedException extends ApplicationException {

    @Serial
    private static final long serialVersionUID = 1L;

    public AuthenticationFailedException(ErrorCode code, String message) {
        super(code, message);
    }

    /// Wrong password and unknown address answer identically, so sign-in cannot be used to
    /// discover which addresses are registered.
    public static AuthenticationFailedException invalidCredentials() {
        return new AuthenticationFailedException(ErrorCode.INVALID_CREDENTIALS,
                "The email address or password is incorrect");
    }
}
