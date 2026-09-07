package com.bimap.platform.error;

import org.springframework.http.HttpStatus;

/// The closed catalogue of failures the API is allowed to report.
/// @author Khova Krishna Pilato
public enum ErrorCode {

    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "Request validation failed"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "Malformed request"),

    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "Invalid credentials"),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Token is not valid"),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "Token has expired"),
    AUTHENTICATION_REQUIRED(HttpStatus.UNAUTHORIZED, "Authentication required"),

    ACCOUNT_NOT_ACTIVATED(HttpStatus.FORBIDDEN, "Account is not activated"),
    ACCOUNT_LOCKED(HttpStatus.FORBIDDEN, "Account is locked"),
    ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "Account is disabled"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "Access denied"),

    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "Resource not found"),

    RESOURCE_CONFLICT(HttpStatus.CONFLICT, "Resource conflict"),
    EMAIL_ALREADY_REGISTERED(HttpStatus.CONFLICT, "Email address already registered"),

    BUSINESS_RULE_VIOLATED(HttpStatus.UNPROCESSABLE_ENTITY, "Business rule violated"),

    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "Too many requests"),

    UPSTREAM_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "Upstream service unavailable"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected internal error");

    private final HttpStatus status;
    private final String title;

    ErrorCode(HttpStatus status, String title) {
        this.status = status;
        this.title = title;
    }

    public HttpStatus status() {
        return status;
    }

    public String title() {
        return title;
    }

    /// Lower-kebab slug used as the last segment of the RFC 7807 `type` URI.
    public String slug() {
        return name().toLowerCase(java.util.Locale.ROOT).replace('_', '-');
    }
}
