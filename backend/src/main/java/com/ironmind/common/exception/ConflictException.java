package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when the requested change conflicts with the current state of the resource.
 */
public class ConflictException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ConflictException(String message) {
        super(ErrorCode.CONFLICT, message);
    }
}
