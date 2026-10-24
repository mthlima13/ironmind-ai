package com.ironmind.auth.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Limits of the authentication rate limiter.
 *
 * <p>The values are configurable so the environment can tighten or loosen them without a code
 * change (SPEC.md section 14.2). Every scope has two independent counters: one per caller
 * address and one per account. The address ceiling is the account ceiling multiplied by
 * {@code ipMultiplier}, because a single network can legitimately serve several accounts while a
 * single account must not be attacked from one place.
 *
 * @param login          limit of the login attempts
 * @param register       limit of the account creation attempts
 * @param forgotPassword limit of the password recovery requests
 * @param refresh        limit of the session refresh attempts
 * @param resetPassword  limit of the password reset attempts
 * @param ipMultiplier   factor applied to the account ceiling to build the address ceiling
 */
@ConfigurationProperties(prefix = "app.security.rate-limit")
public record RateLimitProperties(Window login, Window register, Window forgotPassword, Window refresh,
        Window resetPassword, int ipMultiplier) {

    /**
     * Default number of requests of the login endpoint.
     */
    private static final int DEFAULT_LOGIN_REQUESTS = 10;

    /**
     * Default number of requests of the registration endpoint.
     */
    private static final int DEFAULT_REGISTER_REQUESTS = 5;

    /**
     * Default number of requests of the password recovery endpoint.
     */
    private static final int DEFAULT_FORGOT_PASSWORD_REQUESTS = 5;

    /**
     * Default number of requests of the session refresh endpoint.
     */
    private static final int DEFAULT_REFRESH_REQUESTS = 30;

    /**
     * Default number of requests of the password reset endpoint.
     */
    private static final int DEFAULT_RESET_PASSWORD_REQUESTS = 10;

    /**
     * Default length of the window, in seconds.
     */
    private static final int DEFAULT_WINDOW_SECONDS = 60;

    /**
     * Default factor between the account ceiling and the address ceiling.
     */
    private static final int DEFAULT_IP_MULTIPLIER = 4;

    public RateLimitProperties {
        login = login == null ? new Window(DEFAULT_LOGIN_REQUESTS, DEFAULT_WINDOW_SECONDS) : login;
        register = register == null ? new Window(DEFAULT_REGISTER_REQUESTS, DEFAULT_WINDOW_SECONDS) : register;
        forgotPassword = forgotPassword == null
                ? new Window(DEFAULT_FORGOT_PASSWORD_REQUESTS, DEFAULT_WINDOW_SECONDS)
                : forgotPassword;
        refresh = refresh == null ? new Window(DEFAULT_REFRESH_REQUESTS, DEFAULT_WINDOW_SECONDS) : refresh;
        resetPassword = resetPassword == null
                ? new Window(DEFAULT_RESET_PASSWORD_REQUESTS, DEFAULT_WINDOW_SECONDS)
                : resetPassword;
        if (ipMultiplier < 1) {
            ipMultiplier = DEFAULT_IP_MULTIPLIER;
        }
    }

    /**
     * Returns the window applied to the given scope.
     */
    public Window windowFor(RateLimitScope scope) {
        return switch (scope) {
            case LOGIN -> login;
            case REGISTER -> register;
            case FORGOT_PASSWORD -> forgotPassword;
            case REFRESH -> refresh;
            case RESET_PASSWORD -> resetPassword;
        };
    }

    /**
     * Limit of a window.
     *
     * @param maxRequests   maximum number of requests accepted inside the window for one account
     * @param windowSeconds length of the window, in seconds
     */
    public record Window(int maxRequests, int windowSeconds) {

        public Window {
            if (maxRequests <= 0) {
                maxRequests = DEFAULT_LOGIN_REQUESTS;
            }
            if (windowSeconds <= 0) {
                windowSeconds = DEFAULT_WINDOW_SECONDS;
            }
        }
    }
}
