package com.ironmind.auth.ratelimit;

/**
 * Endpoints protected by the authentication rate limiter.
 */
public enum RateLimitScope {

    /**
     * Login attempts.
     */
    LOGIN,

    /**
     * Account creation attempts.
     */
    REGISTER,

    /**
     * Password recovery requests.
     */
    FORGOT_PASSWORD,

    /**
     * Session refresh attempts.
     */
    REFRESH,

    /**
     * Password reset attempts, protected by the token informed by the client.
     */
    RESET_PASSWORD
}
