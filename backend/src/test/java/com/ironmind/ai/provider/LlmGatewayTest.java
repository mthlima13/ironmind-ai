package com.ironmind.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.common.exception.AiInvalidResponseException;
import com.ironmind.common.exception.AiUnavailableException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LlmGatewayTest {

    private static final WorkoutProposalPayload PAYLOAD =
            new WorkoutProposalPayload("Treino", null, List.of(), "Explicação");

    @Mock
    private LlmProvider provider;

    private final MutableClock clock = new MutableClock();

    @Test
    @DisplayName("retries a transient failure and returns the answer of the next attempt")
    void retriesATransientFailure() {
        LlmGateway gateway = new LlmGateway(provider, 1, 5, 30, clock);
        when(provider.proposeWorkout(any(), any()))
                .thenThrow(new LlmTransportException("timeout", true))
                .thenReturn(PAYLOAD);

        WorkoutProposalPayload result = gateway.proposeWorkout(null, "pedido");

        assertThat(result).isSameAs(PAYLOAD);
        verify(provider, times(2)).proposeWorkout(any(), any());
    }

    @Test
    @DisplayName("maps a failure that is not retryable to AI unavailable without a second attempt")
    void mapsAFailureThatIsNotRetryable() {
        LlmGateway gateway = new LlmGateway(provider, 1, 5, 30, clock);
        when(provider.proposeWorkout(any(), any()))
                .thenThrow(new LlmTransportException("status 401", false));

        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiUnavailableException.class);
        verify(provider, times(1)).proposeWorkout(any(), any());
    }

    @Test
    @DisplayName("maps the exhaustion of the retries to AI unavailable")
    void mapsTheExhaustionOfTheRetries() {
        LlmGateway gateway = new LlmGateway(provider, 1, 5, 30, clock);
        when(provider.proposeWorkout(any(), any()))
                .thenThrow(new LlmTransportException("timeout", true));

        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiUnavailableException.class);
        verify(provider, times(2)).proposeWorkout(any(), any());
    }

    @Test
    @DisplayName("maps an answer outside of the schema to AI invalid response without retrying")
    void mapsAnAnswerOutsideOfTheSchema() {
        LlmGateway gateway = new LlmGateway(provider, 3, 5, 30, clock);
        when(provider.proposeWorkout(any(), any()))
                .thenThrow(new LlmSchemaException("formato inválido"));

        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiInvalidResponseException.class);
        verify(provider, times(1)).proposeWorkout(any(), any());
    }

    @Test
    @DisplayName("opens the circuit after the configured number of failures and answers fast")
    void opensTheCircuitAfterTheConfiguredNumberOfFailures() {
        LlmGateway gateway = new LlmGateway(provider, 0, 2, 30, clock);
        when(provider.proposeWorkout(any(), any()))
                .thenThrow(new LlmTransportException("indisponível", false));

        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiUnavailableException.class);
        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiUnavailableException.class);
        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiUnavailableException.class);

        verify(provider, times(2)).proposeWorkout(any(), any());
    }

    @Test
    @DisplayName("closes the circuit after the open period")
    void closesTheCircuitAfterTheOpenPeriod() {
        LlmGateway gateway = new LlmGateway(provider, 0, 1, 30, clock);
        when(provider.proposeWorkout(any(), any()))
                .thenThrow(new LlmTransportException("indisponível", false))
                .thenReturn(PAYLOAD);

        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiUnavailableException.class);
        assertThatThrownBy(() -> gateway.proposeWorkout(null, "pedido"))
                .isInstanceOf(AiUnavailableException.class);

        clock.advance(Duration.ofSeconds(31));

        assertThat(gateway.proposeWorkout(null, "pedido")).isSameAs(PAYLOAD);
        verify(provider, times(2)).proposeWorkout(any(), any());
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
