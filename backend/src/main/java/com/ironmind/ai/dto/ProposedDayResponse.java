package com.ironmind.ai.dto;

import java.util.List;

/**
 * Day of a validated workout proposal.
 *
 * @param name      name of the day
 * @param exercises exercises of the day
 */
public record ProposedDayResponse(String name, List<ProposedExerciseResponse> exercises) {
}
