package com.bimap.iam.modules.auth.service;

import jakarta.servlet.http.HttpServletRequest;

/// Where a token was issued from, kept alongside it so sessions can be audited.
/// @author Khova Krishna Pilato
public record ClientFingerprint(String ipAddress, String userAgent) {

    private static final int MAX_USER_AGENT = 256;

    public static ClientFingerprint unknown() {
        return new ClientFingerprint(null, null);
    }

    public static ClientFingerprint from(HttpServletRequest request) {
        return new ClientFingerprint(clientIp(request), truncate(request.getHeader("User-Agent")));
    }

    private static String clientIp(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].strip();
        }
        return request.getRemoteAddr();
    }

    private static String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= MAX_USER_AGENT ? value : value.substring(0, MAX_USER_AGENT);
    }
}
