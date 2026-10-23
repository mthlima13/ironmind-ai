package com.ironmind.ai.provider;

/**
 * Answer of the provider outside of the schema defined by the backend.
 *
 * <p>It never becomes a {@code 500}: the gateway maps it to {@code AI_INVALID_RESPONSE}, because
 * the client must be able to distinguish a broken model answer from a failure of the server.
 */
public class LlmSchemaException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public LlmSchemaException(String message) {
        super(message);
    }

    public LlmSchemaException(String message, Throwable cause) {
        super(message, cause);
    }
}
