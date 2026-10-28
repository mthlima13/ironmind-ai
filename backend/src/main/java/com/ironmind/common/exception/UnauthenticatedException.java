package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when an operation requires a user of the request but none is available.
 */
public class UnauthenticatedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public UnauthenticatedException(String message) {
        super(ErrorCode.UNAUTHENTICATED, message);
    }
}
