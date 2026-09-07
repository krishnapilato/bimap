package com.bimap.iam.modules.user.domain;

/// How an account proves who it is.
/// @author Khova Krishna Pilato
public enum AuthProvider {

    /// Email and password held by us.
    LOCAL,

    /// Google sign-in; no password is ever stored.
    GOOGLE;

    public boolean requiresPassword() {
        return this == LOCAL;
    }
}
