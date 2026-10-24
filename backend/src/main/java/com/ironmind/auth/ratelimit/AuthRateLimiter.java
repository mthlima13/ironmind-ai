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
 * soon as the window ends. Every attempt increments two independent counters, one for the caller
 * address and one for the account (or the credential being presented), and the attempt is
 * rejected when either of them exceeds its ceiling. An attacker therefore cannot rotate e-mails
 * to escape the address limit nor rotate addresses to escape the account limit.
 *
 * <p><strong>Known limitation:</strong> the counters live in the heap of a single instance, so
 * they are not shared between instances and they are lost on restart. A multi-instance
 * deployment needs a shared store such as Redis.
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
     * @param scope    endpoint being protected
     * @param clientIp address of the caller
     * @param account  e-mail or credential that identifies the target of the attempt; when it is
     *                 blank, only the address counter is applied
     * @throws RateLimitExceededException when the caller exceeded the limit of the scope
     */
    public void check(RateLimitScope scope, String clientIp, String account) {
        RateLimitProperties.Window window = properties.windowFor(scope);
        Instant now = Instant.now();

        Counter addressCounter = register(scope, addressKey(scope, clientIp), now, window);
        Counter accountCounter = account == null || account.isBlank()
                ? null
                : register(scope, accountKey(scope, account), now, window);

        purgeExpired(now, window.windowSeconds());

        if (addressCounter.count() > addressLimit(window)) {
            throw rejected(now, addressCounter, window);
        }
        if (accountCounter != null && accountCounter.count() > window.maxRequests()) {
            throw rejected(now, accountCounter, window);
        }
    }

    /**
     * Tells whether the caller can still make an attempt, without consuming the budget.
     */
    public boolean isAllowed(RateLimitScope scope, String clientIp, String account) {
        RateLimitProperties.Window window = properties.windowFor(scope);
        Instant now = Instant.now();
        if (isExhausted(counters.get(addressKey(scope, clientIp)), now, window, addressLimit(window))) {
            return false;
        }
        return account == null || account.isBlank()
                || !isExhausted(counters.get(accountKey(scope, account)), now, window, window.maxRequests());
    }

    private Counter register(RateLimitScope scope, String key, Instant now, RateLimitProperties.Window window) {
        return counters.compute(key, (ignored, existing) -> {
            if (existing == null || windowEnded(existing, now, window)) {
                return new Counter(now, 1);
            }
            return new Counter(existing.startedAt(), existing.count() + 1);
        });
    }

    private int addressLimit(RateLimitProperties.Window window) {
        return Math.max(window.maxRequests(), window.maxRequests() * properties.ipMultiplier());
    }

    private static boolean isExhausted(Counter counter, Instant now, RateLimitProperties.Window window, int limit) {
        return counter != null && !windowEnded(counter, now, window) && counter.count() >= limit;
    }

    private static RateLimitExceededException rejected(Instant now, Counter counter,
            RateLimitProperties.Window window) {
        long retryAfter = Math.max(1L, Duration.between(now,
                counter.startedAt().plusSeconds(window.windowSeconds())).toSeconds());
        return new RateLimitExceededException(
                "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.", retryAfter);
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

    private static String addressKey(RateLimitScope scope, String clientIp) {
        return scope.name() + "|ip|" + normalize(clientIp);
    }

    private static String accountKey(RateLimitScope scope, String account) {
        return scope.name() + "|account|" + normalize(account);
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value.trim().toLowerCase(Locale.ROOT);
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
