package com.ironmind.auth.exception;

import com.ironmind.common.ErrorCode;
import com.ironmind.common.exception.ApiException;

/**
 * Raised when the presented refresh token is unknown, expired, revoked or already used.
 */
public class InvalidRefreshTokenException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidRefreshTokenException(String message) {
        super(ErrorCode.INVALID_REFRESH_TOKEN, message);
    }
}
