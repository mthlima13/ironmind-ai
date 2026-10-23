package com.ironmind.ai.service;

import com.ironmind.ai.config.AiProperties;
import com.ironmind.common.config.LlmProperties;
import com.ironmind.common.exception.RateLimitExceededException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Rate limiter of the AI endpoints (SPEC.md section 14.2).
 *
 * <p>Two ceilings protect the user and the budget of the product: a fixed window of requests per
 * user and a daily quota per user. Both live in memory, so they are neither shared between
 * instances nor kept across a restart; the production version keeps the counters in Redis, where
 * the window is shared by every instance of the API.
 *
 * <p>The check happens before the language model is called: a rejected request never spends a
 * token.
 */
@Component
public class AiRateLimiter {

    private static final int MAX_TRACKED_USERS = 10_000;

    private final Map<UUID, Window> windows = new ConcurrentHashMap<>();
    private final Map<UUID, DailyQuota> dailyQuotas = new ConcurrentHashMap<>();
    private final int maxRequests;
    private final int windowSeconds;
    private final int dailyQuota;
    private final Clock clock;

    public AiRateLimiter(AiProperties properties, LlmProperties llmProperties, Clock clock) {
        this.maxRequests = properties.rateLimit().maxRequests();
        this.windowSeconds = properties.rateLimit().windowSeconds();
        this.dailyQuota = llmProperties.dailyQuotaPerUser();
        this.clock = clock;
    }

    /**
     * Consumes one call of the user.
     *
     * @param userId owner of the call
     * @throws RateLimitExceededException when the window or the daily quota is exceeded
     */
    public void check(UUID userId) {
        Instant now = clock.instant();
        LocalDate today = now.atZone(ZoneOffset.UTC).toLocalDate();
        evictExpired(now, today);

        DailyQuota quota = dailyQuotas.compute(userId, (key, current) -> {
            if (current == null || !current.day().equals(today)) {
                return new DailyQuota(today, 1);
            }
            return new DailyQuota(today, current.count() + 1);
        });
        if (quota.count() > dailyQuota) {
            Instant nextDay = today.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            throw new RateLimitExceededException(
                    "Limite diário de chamadas de IA atingido. Tente novamente amanhã.",
                    Duration.between(now, nextDay).getSeconds());
        }

        Window window = windows.compute(userId, (key, current) -> {
            if (current == null || !now.isBefore(current.resetAt())) {
                return new Window(now.plusSeconds(windowSeconds), 1);
            }
            return new Window(current.resetAt(), current.count() + 1);
        });
        if (window.count() > maxRequests) {
            throw new RateLimitExceededException(
                    "Muitas chamadas de IA em pouco tempo. Aguarde alguns segundos.",
                    Duration.between(now, window.resetAt()).getSeconds());
        }
    }

    private void evictExpired(Instant now, LocalDate today) {
        if (windows.size() > MAX_TRACKED_USERS) {
            windows.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().resetAt()));
        }
        if (dailyQuotas.size() > MAX_TRACKED_USERS) {
            dailyQuotas.entrySet().removeIf(entry -> !entry.getValue().day().equals(today));
        }
    }

    /**
     * Fixed window of one user.
     */
    private record Window(Instant resetAt, int count) {
    }

    /**
     * Daily counter of one user, in UTC.
     */
    private record DailyQuota(LocalDate day, int count) {
    }
}
