package com.ironmind.auth.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ironmind.common.exception.RateLimitExceededException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AuthRateLimiterTest {

    private AuthRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new AuthRateLimiter(new RateLimitProperties(
                new RateLimitProperties.Window(2, 60),
                new RateLimitProperties.Window(1, 60),
                new RateLimitProperties.Window(1, 60),
                new RateLimitProperties.Window(30, 60),
                new RateLimitProperties.Window(10, 60),
                4));
    }

    @Test
    @DisplayName("rejects the attempts made above the limit")
    void rejectsTheAttemptsMadeAboveTheLimit() {
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");

        assertThatThrownBy(() -> rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com"))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(thrown -> assertThat(((RateLimitExceededException) thrown).retryAfterSeconds()).isPositive());
    }

    @Test
    @DisplayName("isolates the budget of an e-mail from the budget of another one")
    void isolatesTheBudgetOfEachEmail() {
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");

        assertThatCode(() -> rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.2", "bruno@example.com"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("applies the account limit across different addresses")
    void appliesTheAccountLimitAcrossDifferentAddresses() {
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");

        assertThatThrownBy(() -> rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.2", "ana@example.com"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    @DisplayName("applies the limit of each scope separately")
    void appliesTheLimitOfEachScopeSeparately() {
        rateLimiter.check(RateLimitScope.REGISTER, "10.0.0.1", "ana@example.com");

        assertThatThrownBy(() -> rateLimiter.check(RateLimitScope.REGISTER, "10.0.0.1", "ana@example.com"))
                .isInstanceOf(RateLimitExceededException.class);

        assertThatCode(() -> rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com"))
                .doesNotThrowAnyException();
        assertThatCode(() -> rateLimiter.check(RateLimitScope.FORGOT_PASSWORD, "10.0.0.1", "ana@example.com"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("normalizes the e-mail before counting the attempts")
    void normalizesTheEmailBeforeCountingTheAttempts() {
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "  ANA@example.com ");

        assertThatThrownBy(() -> rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com"))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    @DisplayName("tells whether the caller can still make an attempt without consuming the budget")
    void tellsWhetherTheCallerCanStillMakeAnAttempt() {
        assertThat(rateLimiter.isAllowed(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com")).isTrue();

        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");
        rateLimiter.check(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com");

        assertThat(rateLimiter.isAllowed(RateLimitScope.LOGIN, "10.0.0.1", "ana@example.com")).isFalse();
    }
}
