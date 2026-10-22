package com.ironmind.common.web;

import com.ironmind.common.TraceIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.slf4j.MDC;

/**
 * Resolves the correlation id of the current request.
 *
 * <p>The id comes from the attribute set by the {@link TraceIdFilter}; the MDC is used as a
 * fallback and, as a last resort, a new identifier is created so the error payload is never
 * missing the field.
 */
public final class TraceIds {

    private TraceIds() {
    }

    /**
     * Returns the correlation id of the request.
     */
    public static String resolve(HttpServletRequest request) {
        Object attribute = request == null ? null : request.getAttribute(TraceIdFilter.TRACE_ID_ATTRIBUTE);
        if (attribute instanceof String traceId && !traceId.isBlank()) {
            return traceId;
        }
        String fromMdc = MDC.get(TraceIdFilter.MDC_KEY);
        if (fromMdc != null && !fromMdc.isBlank()) {
            return fromMdc;
        }
        return UUID.randomUUID().toString();
    }
}
