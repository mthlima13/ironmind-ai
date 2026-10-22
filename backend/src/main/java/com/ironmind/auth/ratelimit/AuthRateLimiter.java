package com.ironmind.auth.ratelimit;

import com.ironmind.common.exception.RateLimitExceededException;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Rate limiter of the authentication endpoints.
 *
 * <p>The implementation uses a fixed window kept in memory: the counter of a key is reset as
 * soon as the window ends. The key joins the address of the caller and the normalized e-mail,
 * so the limit applies to a brute force against a single account from a single origin.
 *
 * <p><strong>Known limitation:</strong> the counters live in the heap of a single instance, so
 * they are not shared between instances and they are lost on restart. The production version
 * keeps the counters in Redis, where the window is shared by every instance of the API.
 */
@Component
public class AuthRateLimiter {

    /**
     * Number of keys kept before the expired ones are purged.
     */
    private static final int PURGE_THRESHOLD = 1_000;

    private final RateLimitProperties properties;

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    public AuthRateLimiter(RateLimitProperties properties) {
        this.properties = properties;
    }

    /**
     * Registers an attempt and rejects it when the limit of the scope was exceeded.
     *
     * @param scope   endpoint being protected
     * @param clientIp address of the caller
     * @param email   e-mail informed by the caller, used to isolate the attempts of an account
     * @throws RateLimitExceededException when the caller exceeded the limit of the scope
     */
    public void check(RateLimitScope scope, String clientIp, String email) {
        RateLimitProperties.Window window = properties.windowFor(scope);
        String key = scope.name() + "|" + normalizeAddress(clientIp) + ":" + normalizeEmail(email);
        Instant now = Instant.now();

        Counter counter = counters.compute(key, (ignored, existing) -> {
            if (existing == null || windowEnded(existing, now, window)) {
                return new Counter(now, 1);
            }
            return new Counter(existing.startedAt(), existing.count() + 1);
        });

        purgeExpired(now, window.windowSeconds());

        if (counter.count() > window.maxRequests()) {
            long retryAfter = Math.max(1L, Duration.between(now, counter.startedAt().plusSeconds(
                    window.windowSeconds())).toSeconds());
            throw new RateLimitExceededException(
                    "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.", retryAfter);
        }
    }

    /**
     * Tells whether the caller can still make an attempt, without consuming the budget.
     */
    public boolean isAllowed(RateLimitScope scope, String clientIp, String email) {
        RateLimitProperties.Window window = properties.windowFor(scope);
        String key = scope.name() + "|" + normalizeAddress(clientIp) + ":" + normalizeEmail(email);
        Counter counter = counters.get(key);
        if (counter == null || windowEnded(counter, Instant.now(), window)) {
            return true;
        }
        return counter.count() < window.maxRequests();
    }

    private static boolean windowEnded(Counter counter, Instant now, RateLimitProperties.Window window) {
        return !counter.startedAt().plusSeconds(window.windowSeconds()).isAfter(now);
    }

    private void purgeExpired(Instant now, int windowSeconds) {
        if (counters.size() < PURGE_THRESHOLD) {
            return;
        }
        counters.entrySet().removeIf(entry -> windowEnded(entry.getValue(), now,
                new RateLimitProperties.Window(1, windowSeconds)));
    }

    private static String normalizeAddress(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return "unknown";
        }
        return clientIp.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return "unknown";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Counter of a key inside the current window.
     *
     * @param startedAt moment the window started
     * @param count     number of requests accepted inside the window
     */
    private record Counter(Instant startedAt, int count) {
    }
}
