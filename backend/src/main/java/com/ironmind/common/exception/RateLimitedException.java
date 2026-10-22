package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when the caller exceeded the allowed number of requests.
 */
public class RateLimitedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public RateLimitedException(String message) {
        super(ErrorCode.RATE_LIMITED, message);
    }
}
