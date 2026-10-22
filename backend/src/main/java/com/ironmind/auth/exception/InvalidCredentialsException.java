package com.ironmind.auth.exception;

import com.ironmind.common.ErrorCode;
import com.ironmind.common.exception.ApiException;

/**
 * Raised when the credentials of a login are not valid.
 *
 * <p>The same exception is used for an unknown e-mail and for a wrong password, so the answer
 * never reveals whether the e-mail exists (SPEC.md section 7.7).
 */
public class InvalidCredentialsException extends ApiException {

    private static final long serialVersionUID = 1L;

    public InvalidCredentialsException(String message) {
        super(ErrorCode.INVALID_CREDENTIALS, message);
    }
}
