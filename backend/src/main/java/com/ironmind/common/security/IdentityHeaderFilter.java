package com.ironmind.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Enumeration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the owner identifier from the header injected by the gateway.
 *
 * <p>The service does not authenticate the caller: the edge layer validates the session and writes
 * the user UUID. This filter only checks that the value has the expected shape and publishes it in
 * the security context.
 *
 * <p>A missing or malformed header leaves the request anonymous instead of failing here. Public
 * routes keep working and private routes answer {@code 401} through the authorization rules.
 */
@Component
public class IdentityHeaderFilter extends OncePerRequestFilter {

    private static final UUID NIL_UUID = new UUID(0L, 0L);

    private final String headerName;

    public IdentityHeaderFilter(IdentityProperties properties) {
        this.headerName = properties.userUuidHeader();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        extractUserId(request, headerName).ifPresent(this::authenticate);
        filterChain.doFilter(request, response);
    }

    private void authenticate(UUID userId) {
        var authentication = new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(userId),
                null,
                List.of());
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    /**
     * Extracts the owner identifier from the header.
     *
     * <p>The value must be exactly one canonical UUID: duplicated headers, concatenated values,
     * the nil UUID, upper case hexadecimal outside the canonical form and any other format are
     * rejected.
     *
     * @return the identifier, or empty when the header is absent or invalid
     */
    static Optional<UUID> extractUserId(HttpServletRequest request, String headerName) {
        Enumeration<String> values = request.getHeaders(headerName);
        if (values == null || !values.hasMoreElements()) {
            return Optional.empty();
        }
        String raw = values.nextElement();
        if (values.hasMoreElements() || raw == null) {
            return Optional.empty();
        }

        String candidate = raw.trim();
        if (candidate.isEmpty() || candidate.indexOf(',') >= 0) {
            return Optional.empty();
        }

        UUID userId;
        try {
            userId = UUID.fromString(candidate);
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }

        // UUID.fromString is lenient with shortened groups: only the canonical form is accepted.
        if (!userId.toString().equalsIgnoreCase(candidate) || NIL_UUID.equals(userId)) {
            return Optional.empty();
        }
        return Optional.of(userId);
    }
}
