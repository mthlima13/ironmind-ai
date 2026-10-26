package com.ironmind.common.web;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Resolves the address of the caller.
 *
 * <p>The address is used as a key of the rate limiter. Forwarded headers are only trusted when
 * the request comes from an address configured in {@code app.security.trusted-proxies}; otherwise
 * the value of {@link HttpServletRequest#getRemoteAddr()} is used to prevent spoofing.
 */
@Component
@ConfigurationProperties(prefix = "app.security")
public class ClientIpResolver {

    /**
     * Header written by the proxy with the address of the original caller.
     */
    private static final String FORWARDED_FOR = "X-Forwarded-For";

    private final Set<String> trustedProxies;

    public ClientIpResolver() {
        this(Set.of());
    }

    public ClientIpResolver(Set<String> trustedProxies) {
        this.trustedProxies = trustedProxies == null ? Set.of() : normalize(trustedProxies);
    }

    /**
     * Returns the address of the caller of the request.
     */
    public String resolve(HttpServletRequest request) {
        if (isTrustedProxy(request.getRemoteAddr()) && request.getHeader(FORWARDED_FOR) != null) {
            String forwarded = request.getHeader(FORWARDED_FOR);
            if (!forwarded.isBlank()) {
                String first = forwarded.split(",")[0].trim();
                if (!first.isEmpty() && isIpAddress(first)) {
                    return first;
                }
            }
        }
        String remoteAddress = request.getRemoteAddr();
        return remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress.trim();
    }

    public void setTrustedProxies(Set<String> trustedProxies) {
        // no-op: constructor-based configuration; kept for compatibility
    }

    private boolean isTrustedProxy(String remoteAddr) {
        if (remoteAddr == null || remoteAddr.isBlank() || trustedProxies.isEmpty()) {
            return false;
        }
        String normalized = normalize(remoteAddr);
        return trustedProxies.contains(normalized);
    }

    private static Set<String> normalize(Set<String> values) {
        Set<String> normalized = new HashSet<>();
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                normalized.add(normalize(value));
            }
        }
        return normalized;
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isIpAddress(String value) {
        try {
            InetAddress.getByName(value);
            return true;
        } catch (UnknownHostException ex) {
            return false;
        }
    }
}
