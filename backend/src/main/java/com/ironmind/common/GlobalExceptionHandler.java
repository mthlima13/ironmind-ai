package com.ironmind.common;

import com.ironmind.common.exception.ApiException;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.RateLimitExceededException;
import com.ironmind.common.web.TraceIds;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Translates every exception into the single error payload defined in SPEC.md appendix A.
 *
 * <p>The handler never exposes a stack trace, a file path, a table name or any other internal
 * detail to the client; unexpected failures are logged on the server side only.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Bean Validation failure on a request body.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::toFieldError)
                .toList();
        ApiError body = ApiError.of(ErrorCode.VALIDATION_ERROR,
                "Um ou mais campos inválidos foram enviados.",
                request.getRequestURI(),
                traceIdOf(request),
                fieldErrors);
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status()).body(body);
    }

    /**
     * Bean Validation failure on a method parameter (for example a validated query parameter).
     */
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiError> handleHandlerMethodValidation(HandlerMethodValidationException ex,
            HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = ex.getParameterValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream()
                        .map(error -> new ApiError.FieldError(result.getMethodParameter().getParameterName(),
                                error.getDefaultMessage())))
                .toList();
        ApiError body = ApiError.of(ErrorCode.VALIDATION_ERROR,
                "Um ou mais campos inválidos foram enviados.",
                request.getRequestURI(),
                traceIdOf(request),
                fieldErrors);
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status()).body(body);
    }

    /**
     * Bean Validation failure on a service level constraint.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex,
            HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = ex.getConstraintViolations().stream()
                .map(violation -> new ApiError.FieldError(lastNode(violation),
                        violation.getMessage()))
                .toList();
        ApiError body = ApiError.of(ErrorCode.VALIDATION_ERROR,
                "Um ou mais campos inválidos foram enviados.",
                request.getRequestURI(),
                traceIdOf(request),
                fieldErrors);
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status()).body(body);
    }

    /**
     * Malformed or unreadable request payload.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex,
            HttpServletRequest request) {
        log.debug("Unreadable request body on {}: {}", request.getRequestURI(), ex.getMessage());
        ApiError body = ApiError.of(ErrorCode.VALIDATION_ERROR,
                "Corpo da requisição inválido ou malformado.",
                request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status()).body(body);
    }

    /**
     * Query or path parameter with an unexpected type or a missing required parameter.
     */
    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ApiError> handleBadParameter(Exception ex, HttpServletRequest request) {
        ApiError body = ApiError.of(ErrorCode.VALIDATION_ERROR,
                "Parâmetro de requisição inválido.",
                request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status()).body(body);
    }

    /**
     * Domain exceptions raised by the services.
     */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex, HttpServletRequest request) {
        ErrorCode errorCode = ex.getErrorCode();
        ApiError body = ApiError.of(errorCode, ex.getMessage(), request.getRequestURI(), traceIdOf(request));
        return ResponseEntity.status(errorCode.status()).body(body);
    }

    /**
     * A business rule of the service layer rejected a field of the payload.
     *
     * <p>The name of the rejected field is kept in the answer, so the client can point the user
     * to the right input.
     */
    @ExceptionHandler(FieldValidationException.class)
    public ResponseEntity<ApiError> handleFieldValidation(FieldValidationException ex,
            HttpServletRequest request) {
        ApiError body = ApiError.of(ErrorCode.VALIDATION_ERROR,
                ex.getMessage(),
                request.getRequestURI(),
                traceIdOf(request),
                ex.getFieldErrors());
        return ResponseEntity.status(ErrorCode.VALIDATION_ERROR.status()).body(body);
    }

    /**
     * The caller exceeded the allowed number of requests.
     *
     * <p>The answer informs how long the caller must wait through the {@code Retry-After}
     * header.
     */
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ApiError> handleRateLimitExceeded(RateLimitExceededException ex,
            HttpServletRequest request) {
        ApiError body = ApiError.of(ErrorCode.RATE_LIMITED, ex.getMessage(), request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(ErrorCode.RATE_LIMITED.status())
                .header(HttpHeaders.RETRY_AFTER, Long.toString(ex.retryAfterSeconds()))
                .body(body);
    }

    /**
     * Missing or expired credentials.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        ApiError body = ApiError.of(ErrorCode.UNAUTHENTICATED,
                ErrorCode.UNAUTHENTICATED.defaultMessage(),
                request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(ErrorCode.UNAUTHENTICATED.status()).body(body);
    }

    /**
     * Authenticated principal without permission for the operation.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ApiError body = ApiError.of(ErrorCode.FORBIDDEN,
                ErrorCode.FORBIDDEN.defaultMessage(),
                request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(ErrorCode.FORBIDDEN.status()).body(body);
    }

    /**
     * Unknown route or missing resource.
     */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ApiError> handleNotFound(Exception ex, HttpServletRequest request) {
        ApiError body = ApiError.of(ErrorCode.NOT_FOUND,
                ErrorCode.NOT_FOUND.defaultMessage(),
                request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(ErrorCode.NOT_FOUND.status()).body(body);
    }

    /**
     * Database constraint violation translated into a conflict.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex,
            HttpServletRequest request) {
        log.warn("Data integrity violation on {}: {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        ApiError body = ApiError.of(ErrorCode.CONFLICT,
                "A operação conflita com o estado atual dos dados.",
                request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(ErrorCode.CONFLICT.status()).body(body);
    }

    /**
     * Last resort handler: the internal detail is logged, never returned.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unexpected failure on {} {}", request.getMethod(), request.getRequestURI(), ex);
        ApiError body = ApiError.of(ErrorCode.INTERNAL_ERROR,
                ErrorCode.INTERNAL_ERROR.defaultMessage(),
                request.getRequestURI(),
                traceIdOf(request));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    private static ApiError.FieldError toFieldError(FieldError fieldError) {
        String message = fieldError.getDefaultMessage();
        return new ApiError.FieldError(fieldError.getField(),
                message == null ? "Valor inválido." : message);
    }

    private static String lastNode(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString();
        int separator = path.lastIndexOf('.');
        return separator < 0 ? path : path.substring(separator + 1);
    }

    /**
     * Resolves the correlation id of the request, falling back to the MDC and then to a new one.
     */
    static String traceIdOf(HttpServletRequest request) {
        return TraceIds.resolve(request);
    }
}
