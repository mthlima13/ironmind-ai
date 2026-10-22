package com.ironmind.workout.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Estimation of the one repetition maximum (SPEC.md section 7.3).
 *
 * <p>The estimation is calculated only in the backend and is always displayed as an estimate: it
 * is not a real measurement and it loses accuracy with high repetition counts, with isolated
 * movements and with loads reduced by assistance.
 *
 * <p><strong>Decision 1 of SPEC.md section 20 (closed):</strong> the product uses
 * <em>Brzycki</em>. The formula and the validity limits below are the official rule, not a
 * provisional choice:
 *
 * <pre>
 * 1RM = carga × 36 / (37 - repetições)
 * </pre>
 *
 * <p>Brzycki returns exactly the performed load for a single repetition and is slightly more
 * conservative than Epley between 5 and 12 repetitions, which is the range used by most
 * hypertrophy programs. The estimate is produced only from 1 to 10 repetitions: beyond that
 * point the formula loses accuracy and the API returns no estimate instead of a number that
 * looks precise.
 */
@Component
public class OneRepMaxCalculator {

    /**
     * Maximum number of repetitions accepted by the estimation.
     *
     * <p>Beyond that point the formula becomes unreliable, so the estimation is not produced.
     * The limit is part of decision 1 of SPEC.md section 20.
     */
    public static final int MAX_REPETITIONS_FOR_ESTIMATE = 10;

    /**
     * Number of decimal places used by the estimation.
     */
    public static final int SCALE = 2;

    /**
     * Estimates the one repetition maximum of a set.
     *
     * @param weightKg    load in kilograms, {@code null} or zero when there is no measurable load
     * @param repetitions number of repetitions performed
     * @return the estimated maximum, or an empty optional when the inputs are outside of the
     *         validity range of the formula
     */
    public Optional<BigDecimal> estimate(BigDecimal weightKg, int repetitions) {
        if (weightKg == null || weightKg.signum() <= 0) {
            return Optional.empty();
        }
        if (repetitions < 1 || repetitions > MAX_REPETITIONS_FOR_ESTIMATE) {
            return Optional.empty();
        }
        BigDecimal estimate = weightKg
                .multiply(BigDecimal.valueOf(36))
                .divide(BigDecimal.valueOf(37L - repetitions), SCALE, RoundingMode.HALF_UP);
        return Optional.of(estimate);
    }
}
