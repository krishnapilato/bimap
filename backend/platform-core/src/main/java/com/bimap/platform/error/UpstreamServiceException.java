package com.bimap.platform.error;

import java.io.Serial;

/// A third-party API we depend on failed, timed out, or answered with something unusable.
/// @author Khova Krishna Pilato
public final class UpstreamServiceException extends ApplicationException {

    @Serial
    private static final long serialVersionUID = 1L;

    public UpstreamServiceException(String upstream, String message, Throwable cause) {
        super(ErrorCode.UPSTREAM_UNAVAILABLE, "%s: %s".formatted(upstream, message), cause, true);
        with("upstream", upstream);
    }
}
