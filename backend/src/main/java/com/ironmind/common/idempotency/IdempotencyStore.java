package com.ironmind.common.idempotency;

import java.time.Instant;
import java.util.UUID;

/**
 * Storage of the idempotency keys used by write operations that create records.
 *
 * <p>The contract follows SPEC.md appendix A.3: the key is scoped by user and endpoint, a replay
 * with the same payload returns the original result and a replay with a different payload is a
 * conflict.
 */
public interface IdempotencyStore {

    /**
     * Entry associated with an idempotency key.
     *
     * @param scope             endpoint scope of the key
     * @param key               value of the {@code Idempotency-Key} header
     * @param userId            owner of the request
     * @param payloadFingerprint fingerprint of the accepted payload
     * @param resourceId        identifier of the created resource
     * @param createdAt         moment of the creation
     */
    record Entry(String scope, String key, UUID userId, String payloadFingerprint, UUID resourceId, Instant createdAt) {
    }

    /**
     * Returns the entry of the given key, when it exists and is still valid.
     */
    Entry find(String scope, String key, UUID userId);

    /**
     * Stores the result of a request for later replay.
     */
    void save(Entry entry);
}
