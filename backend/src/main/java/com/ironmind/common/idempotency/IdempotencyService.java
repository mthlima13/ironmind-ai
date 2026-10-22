package com.ironmind.common.idempotency;

import com.ironmind.common.exception.IdempotencyKeyReusedException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Applies the idempotency contract of SPEC.md appendix A.3 to write operations.
 *
 * <p>The key is scoped by user and endpoint. A replay with the same payload returns the original
 * resource instead of creating a new one; a replay with a different payload is a conflict.
 */
@Service
public class IdempotencyService {

    private final IdempotencyStore store;

    public IdempotencyService(IdempotencyStore store) {
        this.store = store;
    }

    /**
     * Returns the resource created by a previous request with the same key, when the payload
     * matches.
     *
     * @throws IdempotencyKeyReusedException when the key was already used with a different payload
     */
    public Optional<UUID> findExistingResource(String scope, String key, UUID userId, String payloadFingerprint) {
        if (key == null || key.isBlank()) {
            return Optional.empty();
        }
        IdempotencyStore.Entry entry = store.find(scope, key, userId);
        if (entry == null) {
            return Optional.empty();
        }
        if (!entry.payloadFingerprint().equals(payloadFingerprint)) {
            throw new IdempotencyKeyReusedException(
                    "A chave de idempotência já foi utilizada com um conteúdo diferente.");
        }
        return Optional.of(entry.resourceId());
    }

    /**
     * Stores the result of the request so a replay can return the same resource.
     */
    public void remember(String scope, String key, UUID userId, String payloadFingerprint, UUID resourceId) {
        if (key == null || key.isBlank()) {
            return;
        }
        store.save(new IdempotencyStore.Entry(scope, key, userId, payloadFingerprint, resourceId, Instant.now()));
    }

    /**
     * Stores the result of the request only after the current transaction commits.
     *
     * <p>Registering the key before the commit would make a replay point to a resource that was
     * never persisted, because the transaction could still be rolled back.
     */
    public void rememberAfterCommit(String scope, String key, UUID userId, String payloadFingerprint,
            UUID resourceId) {
        if (key == null || key.isBlank()) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    remember(scope, key, userId, payloadFingerprint, resourceId);
                }
            });
            return;
        }
        remember(scope, key, userId, payloadFingerprint, resourceId);
    }

    /**
     * Builds a stable fingerprint of the accepted payload.
     */
    public static String fingerprint(String payload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Algoritmo SHA-256 indisponível na JVM.", ex);
        }
    }
}
