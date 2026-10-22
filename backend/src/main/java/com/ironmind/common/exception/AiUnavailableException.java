package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when the AI provider is unreachable or times out.
 */
public class AiUnavailableException extends ApiException {

    private static final long serialVersionUID = 1L;

    public AiUnavailableException(String message) {
        super(ErrorCode.AI_UNAVAILABLE, message);
    }

    public AiUnavailableException(String message, Throwable cause) {
        super(ErrorCode.AI_UNAVAILABLE, message, cause);
    }
}
