package com.ironmind.common.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.common.ApiError;
import com.ironmind.common.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/**
 * Writes the standard error payload outside of the controller pipeline.
 *
 * <p>It is used by the Spring Security entry point and access denied handler so the answers of
 * the authentication layer follow the same contract of the business endpoints.
 */
@Component
public class ApiErrorWriter {

    private final ObjectMapper objectMapper;

    public ApiErrorWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Writes the error payload with the given status and message.
     */
    public void write(HttpServletRequest request, HttpServletResponse response, ErrorCode errorCode, String message)
            throws IOException {
        HttpStatus status = errorCode.status();
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        ApiError body = ApiError.of(errorCode, message, request.getRequestURI(),
                TraceIds.resolve(request));
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
