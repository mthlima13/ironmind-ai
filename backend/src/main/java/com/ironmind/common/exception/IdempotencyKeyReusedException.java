package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when an idempotency key is replayed with a different payload.
 *
 * <p>See SPEC.md appendix A.3: the same key with a different body answers
 * {@code 409 Conflict} with code {@code IDEMPOTENCY_KEY_REUSED}.
 */
public class IdempotencyKeyReusedException extends ApiException {

    private static final long serialVersionUID = 1L;

    public IdempotencyKeyReusedException(String message) {
        super(ErrorCode.IDEMPOTENCY_KEY_REUSED, message);
    }
}
