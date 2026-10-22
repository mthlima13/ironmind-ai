package com.ironmind.auth.dto;

import com.ironmind.user.entity.UserRole;
import java.util.UUID;

/**
 * Answer of the authentication endpoints.
 *
 * @param accessToken  JWT of the session, with a short lifetime
 * @param refreshToken opaque credential used to renew the session
 * @param tokenType    type of the authorization header, always {@code Bearer}
 * @param expiresIn    lifetime of the access token, in seconds
 * @param user         public information of the authenticated user
 */
public record AuthResponse(String accessToken, String refreshToken, String tokenType, long expiresIn, AuthUser user) {

    /**
     * Value of the authorization header.
     */
    public static final String BEARER = "Bearer";

    /**
     * Public information of the authenticated user.
     *
     * @param id    identifier of the account
     * @param name  name of the user
     * @param email normalized e-mail of the user
     * @param role  role of the account
     */
    public record AuthUser(UUID id, String name, String email, UserRole role) {
    }
}
