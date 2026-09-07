package com.bimap.iam.modules.user.domain;

/// Fine-grained authorities carried in the access token and checked by both services.
/// @author Khova Krishna Pilato
public enum Permission {

    REGISTRATION_READ("registration:read"),
    REGISTRATION_WRITE("registration:write"),
    REGISTRATION_READ_ALL("registration:read-all"),
    REGISTRATION_EXPORT("registration:export"),
    USER_READ("user:read"),
    USER_WRITE("user:write"),
    USER_LIFECYCLE("user:lifecycle");

    private final String authority;

    Permission(String authority) {
        this.authority = authority;
    }

    public String authority() {
        return authority;
    }
}
