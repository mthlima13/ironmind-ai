package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when a business rule rejects an otherwise well formed payload.
 *
 * <p>Bean Validation covers the shape of the input; this exception covers the domain rules
 * that only the service layer can evaluate.
 */
public class DomainValidationException extends ApiException {

    private static final long serialVersionUID = 1L;

    public DomainValidationException(String message) {
        super(ErrorCode.VALIDATION_ERROR, message);
    }
}
