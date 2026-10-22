package com.ironmind.workout.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collection;
import org.springframework.stereotype.Component;

/**
 * Calculation of the training volume (SPEC.md section 7.2).
 *
 * <p>The rule implemented here is:
 *
 * <pre>
 * volume = carga × repetições
 * </pre>
 *
 * <p>The volume of an exercise or of a session is the sum of the valid sets.
 *
 * <p><strong>Decision 5 of SPEC.md section 20 (closed):</strong> the volume counts the external
 * load only. A set without external load ({@code weightKg == null}), such as a bodyweight or
 * assisted movement, adds zero to the volume. Isometric and time based movements are not
 * measured by volume. Counting only the external load keeps the metric comparable between users
 * and machines, so the app must never present the number as the total work of a bodyweight set.
 *
 * <p><strong>Canonical unit:</strong> the load is always stored in kilograms. The conversion to
 * pounds happens on the presentation boundary, never in the database.
 */
@Component
public class VolumeCalculator {

    /**
     * Number of decimal places used by the volume.
     */
    public static final int SCALE = 2;

    /**
     * Volume of a single set.
     *
     * @param weightKg    external load in kilograms, {@code null} for bodyweight movements
     * @param repetitions number of repetitions performed
     * @return the volume of the set, zero when the set has no measurable load or no repetition
     * @throws IllegalArgumentException when the load is negative
     */
    public BigDecimal volumeOf(BigDecimal weightKg, Integer repetitions) {
        if (weightKg != null && weightKg.signum() < 0) {
            throw new IllegalArgumentException("A carga não pode ser negativa.");
        }
        if (weightKg == null || repetitions == null || repetitions <= 0) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }
        return weightKg.multiply(BigDecimal.valueOf(repetitions)).setScale(SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Total volume of a collection of sets.
     */
    public BigDecimal totalVolume(Collection<SetVolume> sets) {
        if (sets == null || sets.isEmpty()) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }
        BigDecimal total = BigDecimal.ZERO;
        for (SetVolume set : sets) {
            total = total.add(volumeOf(set.weightKg(), set.repetitions()));
        }
        return total.setScale(SCALE, RoundingMode.HALF_UP);
    }

    /**
     * Minimal representation of a set used by the calculations.
     *
     * @param weightKg    external load in kilograms, {@code null} for bodyweight movements
     * @param repetitions number of repetitions performed
     */
    public record SetVolume(BigDecimal weightKg, Integer repetitions) {
    }
}
