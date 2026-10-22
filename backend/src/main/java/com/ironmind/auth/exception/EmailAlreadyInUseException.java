package com.ironmind.auth.exception;

import com.ironmind.common.ErrorCode;
import com.ironmind.common.exception.ApiException;

/**
 * Raised when the e-mail informed is already used by another account.
 */
public class EmailAlreadyInUseException extends ApiException {

    private static final long serialVersionUID = 1L;

    public EmailAlreadyInUseException(String message) {
        super(ErrorCode.EMAIL_ALREADY_IN_USE, message);
    }
}
