package com.ironmind.common.exception;

import com.ironmind.common.ApiError;
import com.ironmind.common.ErrorCode;
import java.util.List;

/**
 * Raised when a business rule rejects a field of an otherwise well formed payload.
 *
 * <p>Bean Validation covers the shape of the input declared in the DTO; this exception covers the
 * rules that only the service layer can evaluate, keeping the name of the rejected field in the
 * answer of the API (SPEC.md appendix A.1).
 */
public class FieldValidationException extends ApiException {

    private static final long serialVersionUID = 1L;

    private final List<ApiError.FieldError> fieldErrors;

    /**
     * Rejects a single field of the payload.
     *
     * @param field   name of the rejected field, in the path of the request body
     * @param message reason why the value was rejected
     */
    public FieldValidationException(String field, String message) {
        super(ErrorCode.VALIDATION_ERROR, message);
        this.fieldErrors = List.of(new ApiError.FieldError(field, message));
    }

    /**
     * Details of the rejected fields.
     */
    public List<ApiError.FieldError> getFieldErrors() {
        return fieldErrors;
    }
}
