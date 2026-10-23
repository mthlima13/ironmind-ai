package com.ironmind.ai.provider;

/**
 * Transient failure of the provider, such as a timeout or an unavailable service.
 *
 * <p>The gateway retries a retryable transport failure a limited number of times; a failure that
 * is not retryable becomes {@code AI_UNAVAILABLE} immediately.
 */
public class LlmTransportException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final boolean retryable;

    public LlmTransportException(String message, boolean retryable) {
        super(message);
        this.retryable = retryable;
    }

    public LlmTransportException(String message, boolean retryable, Throwable cause) {
        super(message, cause);
        this.retryable = retryable;
    }

    /**
     * Tells whether another attempt may succeed.
     */
    public boolean isRetryable() {
        return retryable;
    }
}
