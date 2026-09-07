package com.bimap.platform.error;

import java.io.Serial;

/// The request is well formed and authorised, but a domain invariant refuses it.
/// @author Khova Krishna Pilato
public final class BusinessRuleException extends ApplicationException {

    @Serial
    private static final long serialVersionUID = 1L;

    public BusinessRuleException(String message) {
        super(ErrorCode.BUSINESS_RULE_VIOLATED, message);
    }

    public BusinessRuleException(ErrorCode code, String message) {
        super(code, message);
    }
}
