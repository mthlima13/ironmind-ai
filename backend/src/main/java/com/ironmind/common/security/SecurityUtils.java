package com.ironmind.common.security;

import com.ironmind.common.exception.UnauthenticatedException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Helper to read the authenticated principal from the security context.
 *
 * <p>The user identifier is always resolved from the access token, never from the request body,
 * as required by SPEC.md section 1.4 and section 11.7.
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /**
     * Returns the authenticated principal, when present.
     */
    public static Optional<AuthenticatedUser> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        return authentication.getPrincipal() instanceof AuthenticatedUser user ? Optional.of(user) : Optional.empty();
    }

    /**
     * Returns the identifier of the authenticated user, when present.
     */
    public static Optional<UUID> currentUserId() {
        return currentUser().map(AuthenticatedUser::userId);
    }

    /**
     * Returns the identifier of the authenticated user or fails when the request is anonymous.
     */
    public static UUID requireCurrentUserId() {
        return currentUserId().orElseThrow(
                () -> new UnauthenticatedException("Autenticação necessária para executar esta operação."));
    }
}
