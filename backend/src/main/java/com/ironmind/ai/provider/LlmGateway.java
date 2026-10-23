package com.ironmind.ai.provider;

import com.ironmind.ai.schema.VoiceInterpretationPayload;
import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.common.exception.AiInvalidResponseException;
import com.ironmind.common.exception.AiUnavailableException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Resilience around the provider (SPEC.md section 12.4).
 *
 * <p>A transient failure is retried a limited number of times; a sequence of failures opens a
 * circuit that makes the endpoint answer fast while the provider is down. Every failure is mapped
 * to {@code AI_UNAVAILABLE} and every answer outside of the schema to {@code AI_INVALID_RESPONSE},
 * so the client never receives a generic {@code 500} because of the model.
 *
 * <p>Nothing sensitive is logged: only the operation, the attempt and a short technical reason.
 */
public class LlmGateway {

    private static final Logger log = LoggerFactory.getLogger(LlmGateway.class);

    private static final String UNAVAILABLE_MESSAGE =
            "O serviço de IA está indisponível no momento. Tente novamente em instantes.";
    private static final String INVALID_RESPONSE_MESSAGE =
            "A resposta da IA não pôde ser validada. Tente novamente.";

    private final LlmProvider provider;
    private final int maxRetries;
    private final int failureThreshold;
    private final long openSeconds;
    private final Clock clock;

    private final AtomicInteger consecutiveFailures = new AtomicInteger();
    private final AtomicReference<Instant> openedAt = new AtomicReference<>();

    public LlmGateway(LlmProvider provider, int maxRetries, int failureThreshold, long openSeconds, Clock clock) {
        this.provider = provider;
        this.maxRetries = Math.max(0, maxRetries);
        this.failureThreshold = Math.max(1, failureThreshold);
        this.openSeconds = Math.max(1L, openSeconds);
        this.clock = clock;
    }

    /**
     * Identifier of the model reported to the user.
     */
    public String modelName() {
        return provider.modelName();
    }

    public WorkoutProposalPayload proposeWorkout(AiContext context, String request) {
        return execute("workout-proposal", () -> provider.proposeWorkout(context, request));
    }

    public String coach(AiContext context, String historySummary, String message) {
        return execute("coach", () -> provider.coach(context, historySummary, message));
    }

    public VoiceInterpretationPayload interpretVoice(String transcript) {
        return execute("voice-interpretation", () -> provider.interpretVoice(transcript));
    }

    private <T> T execute(String operation, Supplier<T> action) {
        failFastWhenCircuitIsOpen(operation);

        int attempts = maxRetries + 1;
        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                T result = action.get();
                onSuccess();
                return result;
            } catch (LlmSchemaException exception) {
                log.warn("LLM {} answered outside of the schema on attempt {}", operation, attempt);
                throw new AiInvalidResponseException(INVALID_RESPONSE_MESSAGE, exception);
            } catch (LlmTransportException exception) {
                if (!exception.isRetryable() || attempt == attempts) {
                    onFailure(operation, exception);
                    throw new AiUnavailableException(UNAVAILABLE_MESSAGE, exception);
                }
                log.warn("LLM {} failed on attempt {} of {}: {}", operation, attempt, attempts,
                        exception.getMessage());
            } catch (RuntimeException exception) {
                onFailure(operation, exception);
                log.warn("LLM {} failed unexpectedly: {}", operation, exception.getClass().getSimpleName());
                throw new AiUnavailableException(UNAVAILABLE_MESSAGE, exception);
            }
        }
        throw new AiUnavailableException(UNAVAILABLE_MESSAGE);
    }

    private void failFastWhenCircuitIsOpen(String operation) {
        Instant opened = openedAt.get();
        if (opened == null) {
            return;
        }
        if (Duration.between(opened, clock.instant()).getSeconds() < openSeconds) {
            log.warn("LLM {} not called: circuit is open", operation);
            throw new AiUnavailableException(UNAVAILABLE_MESSAGE);
        }
        openedAt.compareAndSet(opened, null);
        consecutiveFailures.set(0);
    }

    private void onSuccess() {
        consecutiveFailures.set(0);
        openedAt.set(null);
    }

    private void onFailure(String operation, RuntimeException exception) {
        int failures = consecutiveFailures.incrementAndGet();
        if (failures >= failureThreshold) {
            openedAt.set(clock.instant());
            consecutiveFailures.set(0);
            log.error("LLM {} circuit opened after {} consecutive failures", operation, failures);
        }
    }
}
