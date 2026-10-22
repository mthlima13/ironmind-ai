package com.ironmind.common.security;

import com.ironmind.user.entity.UserRole;
import java.security.Principal;
import java.util.UUID;

/**
 * Authenticated principal of the current request.
 *
 * @param userId identifier of the authenticated user, always taken from the access token
 * @param email  e-mail of the authenticated user
 * @param role   role of the authenticated user
 */
public record AuthenticatedUser(UUID userId, String email, UserRole role) implements Principal {

    @Override
    public String getName() {
        return email;
    }
}
