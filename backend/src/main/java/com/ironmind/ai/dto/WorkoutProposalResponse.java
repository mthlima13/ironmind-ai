package com.ironmind.ai.dto;

import com.ironmind.ai.entity.RecommendationStatus;
import com.ironmind.user.entity.TrainingGoal;
import java.util.List;
import java.util.UUID;

/**
 * Validated workout proposal returned to the user (SPEC.md section 12.2).
 *
 * <p>The proposal is only a suggestion: nothing is persisted as a program until the user reviews,
 * edits and saves it through the program endpoints. The identifier allows the review decision to
 * be recorded afterwards.
 *
 * @param recommendationId identifier of the pending recommendation
 * @param status           lifecycle state, always {@code PENDING} right after the proposal
 * @param model            model that produced the proposal
 * @param name             name of the proposed program
 * @param goal             goal of the proposed program
 * @param days             validated days of the program
 * @param explanation      explanation shown to the user on review
 * @param warnings         adjustments and removals applied by the backend
 * @param disclaimer       visible notice that the suggestion is informative
 */
public record WorkoutProposalResponse(
        UUID recommendationId,
        RecommendationStatus status,
        String model,
        String name,
        TrainingGoal goal,
        List<ProposedDayResponse> days,
        String explanation,
        List<String> warnings,
        String disclaimer) {
}
