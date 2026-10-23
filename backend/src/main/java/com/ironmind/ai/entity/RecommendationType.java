package com.ironmind.ai.entity;

/**
 * Kind of recommendation stored in {@code ai_recommendations} (SPEC.md section 10.13).
 *
 * <p>The names must match the PostgreSQL enum {@code recommendation_type} exactly.
 */
public enum RecommendationType {

    /**
     * Proposed workout program.
     */
    WORKOUT_PROGRAM,

    /**
     * Suggested load and repetitions for one exercise.
     */
    LOAD_SUGGESTION,

    /**
     * Answer of the coaching chat.
     */
    COACH_REPLY
}
