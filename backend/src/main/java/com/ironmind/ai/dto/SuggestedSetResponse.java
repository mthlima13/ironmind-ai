package com.ironmind.ai.dto;

import java.math.BigDecimal;

/**
 * Set suggested by the AI.
 *
 * @param setNumber       position of the set, starting at one
 * @param weightKg        load in kilograms, {@code null} for bodyweight movements
 * @param repetitions     number of repetitions, zero when the transcription only carried time
 * @param durationSeconds duration of the set, for isometric and cardio movements
 * @param distanceMeters  distance of the set, for cardio movements
 */
public record SuggestedSetResponse(
        int setNumber,
        BigDecimal weightKg,
        int repetitions,
        Integer durationSeconds,
        Integer distanceMeters) {
}
