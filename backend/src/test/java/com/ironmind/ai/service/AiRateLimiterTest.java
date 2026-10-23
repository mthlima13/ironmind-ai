package com.ironmind.ai.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ironmind.ai.config.AiProperties;
import com.ironmind.common.config.LlmProperties;
import com.ironmind.common.exception.RateLimitExceededException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AiRateLimiterTest {

    private static final UUID ANA = UUID.randomUUID();
    private static final UUID BRUNO = UUID.randomUUID();

    @Test
    @DisplayName("rejects the requests above the window limit")
    void rejectsTheRequestsAboveTheWindowLimit() {
        MutableClock clock = new MutableClock();
        AiRateLimiter limiter = limiter(2, 60, 100, clock);

        limiter.check(ANA);
        limiter.check(ANA);

        assertThatThrownBy(() -> limiter.check(ANA))
                .isInstanceOf(RateLimitExceededException.class)
                .satisfies(thrown -> org.assertj.core.api.Assertions
                        .assertThat(((RateLimitExceededException) thrown).retryAfterSeconds())
                        .isPositive());
    }

    @Test
    @DisplayName("frees the window after it expires")
    void freesTheWindowAfterItExpires() {
        MutableClock clock = new MutableClock();
        AiRateLimiter limiter = limiter(1, 60, 100, clock);

        limiter.check(ANA);
        clock.advance(Duration.ofSeconds(61));

        assertThatCode(() -> limiter.check(ANA)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("applies the daily quota even when the window has room")
    void appliesTheDailyQuotaEvenWhenTheWindowHasRoom() {
        MutableClock clock = new MutableClock();
        AiRateLimiter limiter = limiter(100, 60, 2, clock);

        limiter.check(ANA);
        limiter.check(ANA);
        clock.advance(Duration.ofMinutes(2));

        assertThatThrownBy(() -> limiter.check(ANA))
                .isInstanceOf(RateLimitExceededException.class);
    }

    @Test
    @DisplayName("frees the daily quota on the next day")
    void freesTheDailyQuotaOnTheNextDay() {
        MutableClock clock = new MutableClock();
        AiRateLimiter limiter = limiter(100, 60, 1, clock);

        limiter.check(ANA);
        clock.advance(Duration.ofDays(1));

        assertThatCode(() -> limiter.check(ANA)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("isolates the budget of each user")
    void isolatesTheBudgetOfEachUser() {
        MutableClock clock = new MutableClock();
        AiRateLimiter limiter = limiter(1, 60, 100, clock);

        limiter.check(ANA);

        assertThatCode(() -> limiter.check(BRUNO)).doesNotThrowAnyException();
    }

    private static AiRateLimiter limiter(int maxRequests, int windowSeconds, int dailyQuota,
            MutableClock clock) {
        AiProperties properties = new AiProperties(
                new AiProperties.Limits(7, 10, 8, 30, 600, 80, 8, 12, 90),
                new AiProperties.RateLimit(maxRequests, windowSeconds));
        LlmProperties llm = new LlmProperties(
                "mock", null, null, null, 0, 0, dailyQuota, 0, 0, 0);
        return new AiRateLimiter(properties, llm, clock);
    }

    /**
     * Clock that the test moves forward.
     */
    private static final class MutableClock extends Clock {

        private Instant now = Instant.parse("2026-10-22T10:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
