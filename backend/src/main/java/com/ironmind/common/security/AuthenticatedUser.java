package com.ironmind.common.security;

import java.security.Principal;
import java.util.UUID;

/**
 * Owner of the current request.
 *
 * @param userId identifier received from the edge layer; never taken from the request body
 */
public record AuthenticatedUser(UUID userId) implements Principal {

    @Override
    public String getName() {
        return userId.toString();
    }
}
