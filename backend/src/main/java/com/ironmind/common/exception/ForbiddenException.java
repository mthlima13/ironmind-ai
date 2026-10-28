package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when the user of the request is not allowed to perform an operation.
 */
public class ForbiddenException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ForbiddenException(String message) {
        super(ErrorCode.FORBIDDEN, message);
    }
}
