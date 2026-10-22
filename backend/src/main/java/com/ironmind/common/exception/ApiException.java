package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Base class of every domain exception handled by the global exception handler.
 *
 * <p>Domain code always throws these exceptions instead of generic runtime exceptions so the
 * API contract (SPEC.md appendix A) stays stable.
 */
public abstract class ApiException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final ErrorCode errorCode;

    protected ApiException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    protected ApiException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}
