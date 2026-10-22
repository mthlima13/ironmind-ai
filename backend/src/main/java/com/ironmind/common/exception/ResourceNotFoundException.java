package com.ironmind.common.exception;

import com.ironmind.common.ErrorCode;

/**
 * Raised when a resource does not exist or does not belong to the authenticated user.
 *
 * <p>Per SPEC.md appendix A, resources owned by another user must answer {@code 404} and never
 * {@code 403}, so the existence of foreign data is never revealed.
 */
public class ResourceNotFoundException extends ApiException {

    private static final long serialVersionUID = 1L;

    public ResourceNotFoundException(String message) {
        super(ErrorCode.NOT_FOUND, message);
    }

    public ResourceNotFoundException(String resource, Object id) {
        super(ErrorCode.NOT_FOUND, "Recurso não encontrado: " + resource + " [" + id + "].");
    }
}
