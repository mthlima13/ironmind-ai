package com.ironmind.ai.schema;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

/**
 * Structured answer of the model for a voice transcription (SPEC.md section 11.6).
 *
 * <p>The interpretation is only a suggestion of values to fill the set form: the backend never
 * registers a set from it. The user confirms every value.
 *
 * @param sets  sets recognized in the transcription
 * @param notes notes about what could not be recognized
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record VoiceInterpretationPayload(List<Set> sets, String notes) {

    /**
     * Set recognized in the transcription.
     *
     * @param setNumber       position of the set, starting at one
     * @param weightKg        load in kilograms, {@code null} for bodyweight movements
     * @param repetitions     number of repetitions
     * @param durationSeconds duration of the set, for isometric and cardio movements
     * @param distanceMeters  distance of the set, for cardio movements
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Set(
            Integer setNumber,
            BigDecimal weightKg,
            Integer repetitions,
            Integer durationSeconds,
            Integer distanceMeters) {
    }
}
