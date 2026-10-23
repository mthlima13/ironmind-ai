package com.ironmind.ai.dto;

import java.util.List;

/**
 * Interpretation of a voice transcription (SPEC.md section 11.6).
 *
 * <p>The values only pre-fill the set form: the user confirms every one of them. Nothing is
 * registered by the AI.
 *
 * @param sets        sets recognized in the transcription
 * @param notes       notes about what could not be recognized
 * @param model       model that produced the interpretation
 * @param warnings    values adjusted by the backend
 * @param disclaimer  visible notice that the interpretation must be confirmed
 */
public record VoiceInterpretationResponse(
        List<SuggestedSetResponse> sets,
        String notes,
        String model,
        List<String> warnings,
        String disclaimer) {
}
