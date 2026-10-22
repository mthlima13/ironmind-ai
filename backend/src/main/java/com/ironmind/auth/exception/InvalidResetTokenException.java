package com.ironmind.auth.exception;

import com.ironmind.common.ErrorCode;
import com.ironmind.common.exception.ApiException;

/**
 * Raised when the presented password reset token is unknown, expired or already used.
 */
public class InvalidResetTokenException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidResetTokenException(String message) {
        super(ErrorCode.INVALID_RESET_TOKEN, message);
    }
}
