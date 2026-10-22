package com.ironmind.common;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Unique error payload of the API, exactly as described in SPEC.md appendix A.1.
 *
 * @param timestamp   moment of the failure, truncated to seconds, in UTC
 * @param status      HTTP status code
 * @param error       HTTP reason phrase
 * @param code        stable domain error code (see {@link ErrorCode})
 * @param message     human readable message, never a stack trace or internal detail
 * @param path        request path that produced the failure
 * @param traceId     correlation id, also present in the {@code X-Trace-Id} response header
 * @param fieldErrors validation details per field, {@code null} when not applicable
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path,
        String traceId,
        List<FieldError> fieldErrors) {

    /**
     * Validation detail of a single field.
     *
     * @param field   name of the rejected field
     * @param message reason why the value was rejected
     */
    public record FieldError(String field, String message) {
    }

    /**
     * Builds an error payload without field level details.
     */
    public static ApiError of(ErrorCode code, String message, String path, String traceId) {
        return new ApiError(
                Instant.now().truncatedTo(ChronoUnit.SECONDS),
                code.statusValue(),
                code.reasonPhrase(),
                code.name(),
                message,
                path,
                traceId,
                null);
    }

    /**
     * Builds an error payload with field level details.
     */
    public static ApiError of(ErrorCode code, String message, String path, String traceId, List<FieldError> fieldErrors) {
        return new ApiError(
                Instant.now().truncatedTo(ChronoUnit.SECONDS),
                code.statusValue(),
                code.reasonPhrase(),
                code.name(),
                message,
                path,
                traceId,
                fieldErrors == null || fieldErrors.isEmpty() ? null : List.copyOf(fieldErrors));
    }
}
