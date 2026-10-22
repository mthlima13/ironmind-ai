package com.ironmind.common.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the address of the caller.
 *
 * <p>The address is used as a key of the rate limiter. Behind a proxy, the real address comes
 * from the {@code X-Forwarded-For} header, which only the proxy can write. The application must
 * therefore never be exposed directly to the internet without a proxy that rewrites the
 * header, otherwise the limit can be bypassed by forging it.
 */
public final class ClientIpResolver {

    /**
     * Header written by the proxy with the address of the original caller.
     */
    private static final String FORWARDED_FOR = "X-Forwarded-For";

    private ClientIpResolver() {
    }

    /**
     * Returns the address of the caller of the request.
     */
    public static String resolve(HttpServletRequest request) {
        String forwarded = request.getHeader(FORWARDED_FOR);
        if (forwarded != null && !forwarded.isBlank()) {
            String first = forwarded.split(",")[0].trim();
            if (!first.isEmpty()) {
                return first;
            }
        }
        String remoteAddress = request.getRemoteAddr();
        return remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress;
    }
}
