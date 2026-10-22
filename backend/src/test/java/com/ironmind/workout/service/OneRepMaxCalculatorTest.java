package com.ironmind.workout.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OneRepMaxCalculatorTest {

    private final OneRepMaxCalculator oneRepMaxCalculator = new OneRepMaxCalculator();

    @Test
    @DisplayName("estimates the one repetition maximum with the Brzycki formula")
    void estimatesWithBrzycki() {
        // 100 kg x 36 / (37 - 5) = 112.50 kg
        Optional<BigDecimal> estimate = oneRepMaxCalculator.estimate(new BigDecimal("100.00"), 5);

        assertThat(estimate).isPresent();
        assertThat(estimate.get()).isEqualByComparingTo("112.50");
    }

    @Test
    @DisplayName("estimates 80 kg for ten repetitions at 60 kg")
    void estimatesWithTenRepetitions() {
        // 60 kg x 36 / (37 - 10) = 80.00 kg
        Optional<BigDecimal> estimate = oneRepMaxCalculator.estimate(new BigDecimal("60.00"), 10);

        assertThat(estimate).isPresent();
        assertThat(estimate.get()).isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("returns the performed load for a single repetition")
    void returnsTheLoadForASingleRepetition() {
        Optional<BigDecimal> estimate = oneRepMaxCalculator.estimate(new BigDecimal("80.00"), 1);

        assertThat(estimate).isPresent();
        assertThat(estimate.get()).isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("does not estimate when there is no measurable load")
    void doesNotEstimateWithoutLoad() {
        assertThat(oneRepMaxCalculator.estimate(null, 5)).isEmpty();
        assertThat(oneRepMaxCalculator.estimate(BigDecimal.ZERO, 5)).isEmpty();
    }

    @Test
    @DisplayName("does not estimate outside of the validity range of the formula")
    void doesNotEstimateOutsideTheValidityRange() {
        assertThat(oneRepMaxCalculator.estimate(new BigDecimal("100.00"), 0)).isEmpty();
        assertThat(oneRepMaxCalculator.estimate(new BigDecimal("100.00"), -3)).isEmpty();
        assertThat(oneRepMaxCalculator.estimate(new BigDecimal("100.00"),
                OneRepMaxCalculator.MAX_REPETITIONS_FOR_ESTIMATE + 1)).isEmpty();
    }
}
