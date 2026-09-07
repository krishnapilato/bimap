package com.bimap.platform.error;

import java.io.Serial;

/// The addressed resource does not exist, or the caller may not know that it does.
/// @author Khova Krishna Pilato
public final class ResourceNotFoundException extends ApplicationException {

    @Serial
    private static final long serialVersionUID = 1L;

    public ResourceNotFoundException(String message) {
        super(ErrorCode.RESOURCE_NOT_FOUND, message);
    }

    /// `new ResourceNotFoundException("User", 42)` reads as "User 42 was not found".
    public ResourceNotFoundException(String resource, Object identifier) {
        this("%s %s was not found".formatted(resource, identifier));
        with("resource", resource);
        with("identifier", String.valueOf(identifier));
    }
}
