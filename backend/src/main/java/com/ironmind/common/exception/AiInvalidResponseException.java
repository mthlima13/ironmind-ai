package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when the AI provider answers with a payload outside of the expected schema.
 */
public class AiInvalidResponseException extends ApiException {

    private static final long serialVersionUID = 1L;

    public AiInvalidResponseException(String message) {
        super(ErrorCode.AI_INVALID_RESPONSE, message);
    }

    public AiInvalidResponseException(String message, Throwable cause) {
        super(ErrorCode.AI_INVALID_RESPONSE, message, cause);
    }
}
