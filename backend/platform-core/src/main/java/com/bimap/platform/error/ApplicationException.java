package com.bimap.platform.error;

import java.io.Serial;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/// Base type for every failure the application raises deliberately.
/// @author Khova Krishna Pilato
public sealed class ApplicationException extends RuntimeException
        permits AuthenticationFailedException, BusinessRuleException, ResourceConflictException,
                ResourceNotFoundException, UpstreamServiceException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final ErrorCode code;
    private final transient Map<String, Object> details = new LinkedHashMap<>();

    protected ApplicationException(ErrorCode code, String message, Throwable cause, boolean writableStackTrace) {
        super(message, cause, false, writableStackTrace);
        this.code = code;
    }

    protected ApplicationException(ErrorCode code, String message) {
        this(code, message, null, false);
    }

    public ErrorCode code() {
        return code;
    }

    /// Extra members merged into the problem document, e.g.
    public Map<String, Object> details() {
        return Collections.unmodifiableMap(details);
    }

    /// Attaches one more member.
    public ApplicationException with(String key, Object value) {
        details.put(key, value);
        return this;
    }
}
