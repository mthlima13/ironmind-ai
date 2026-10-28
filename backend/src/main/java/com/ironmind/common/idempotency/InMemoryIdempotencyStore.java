package com.ironmind.common.idempotency;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * In memory implementation of {@link IdempotencyStore}.
 *
 * <p><strong>Known limitation:</strong> the entries live in the heap of a single instance, so they
 * are lost on restart and are not shared between the instances of the API. The registration of a
 * set is the only flow that cannot rely on this limitation, so it keeps the key in the document
 * itself, under a unique index (see
 * {@link com.ironmind.workout.service.ExerciseSetService}).
 */
@Component
public class InMemoryIdempotencyStore implements IdempotencyStore {

    private static final Duration ENTRY_TTL = Duration.ofHours(24);

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    @Override
    public Entry find(String scope, String key, UUID userId) {
        Entry entry = entries.get(index(scope, key, userId));
        if (entry == null) {
            return null;
        }
        if (entry.createdAt().plus(ENTRY_TTL).isBefore(Instant.now())) {
            entries.remove(index(scope, key, userId), entry);
            return null;
        }
        return entry;
    }

    @Override
    public void save(Entry entry) {
        entries.put(index(entry.scope(), entry.key(), entry.userId()), entry);
    }

    private static String index(String scope, String key, UUID userId) {
        return userId + "|" + scope + "|" + key;
    }
}
