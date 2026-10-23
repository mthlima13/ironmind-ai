package com.ironmind.analytics.dto;

import com.ironmind.exercise.dto.ExerciseResponse;
import java.util.List;

/**
 * Evolution of a single exercise (SPEC.md section 11.5).
 *
 * @param exercise exercise that was consulted
 * @param points   days with completed sets, in chronological order
 */
public record ExerciseProgressResponse(
        ExerciseResponse exercise,
        List<ExerciseProgressPointResponse> points) {
}
