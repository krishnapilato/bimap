package com.bimap.platform.error;

import java.io.Serial;

/// The request cannot be applied because it collides with the current state of the resource.
/// @author Khova Krishna Pilato
public final class ResourceConflictException extends ApplicationException {

    @Serial
    private static final long serialVersionUID = 1L;

    public ResourceConflictException(String message) {
        super(ErrorCode.RESOURCE_CONFLICT, message);
    }

    public ResourceConflictException(ErrorCode code, String message) {
        super(code, message);
    }
}
