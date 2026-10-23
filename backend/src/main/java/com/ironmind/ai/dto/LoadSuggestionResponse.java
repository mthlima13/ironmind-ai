package com.ironmind.ai.dto;

import com.ironmind.ai.entity.RecommendationStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Conservative load suggestion returned to the user (SPEC.md section 12.3).
 *
 * <p>The suggestion is never applied automatically: the client only pre-fills the set form and the
 * user confirms it. {@code rule} explains which rule produced the values, so the origin of the
 * suggestion is auditable.
 *
 * @param recommendationId  identifier of the pending recommendation, {@code null} when there is
 *                          nothing to review
 * @param status            lifecycle state of the recommendation
 * @param exerciseId        exercise of the suggestion
 * @param exerciseName      name of the exercise
 * @param sets              suggested sets, empty when there is no history
 * @param rule              rule that produced the suggestion
 * @param confidence        confidence of the suggestion
 * @param explanation       why the values were proposed
 * @param sessionsConsidered number of completed sessions considered
 * @param lastPerformedAt   moment of the last completed session with this exercise
 * @param warnings          conditions the user must know about
 * @param disclaimer        visible notice that the suggestion is informative
 * @param applied           always {@code false}: the backend never applies a suggestion
 */
public record LoadSuggestionResponse(
        UUID recommendationId,
        RecommendationStatus status,
        UUID exerciseId,
        String exerciseName,
        List<SuggestedSetResponse> sets,
        String rule,
        String confidence,
        String explanation,
        int sessionsConsidered,
        Instant lastPerformedAt,
        List<String> warnings,
        String disclaimer,
        boolean applied) {
}
