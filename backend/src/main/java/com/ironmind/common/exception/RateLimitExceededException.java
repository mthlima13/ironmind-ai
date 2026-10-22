package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when the caller exceeded the allowed number of requests.
 *
 * <p>It carries the number of seconds the caller must wait before trying again, so the answer
 * can inform the {@code Retry-After} header.
 */
public class RateLimitExceededException extends ApiException {

    private static final long serialVersionUID = 1L;

    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(ErrorCode.RATE_LIMITED, message);
        this.retryAfterSeconds = Math.max(1L, retryAfterSeconds);
    }

    /**
     * Number of seconds the caller must wait before trying again.
     */
    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
