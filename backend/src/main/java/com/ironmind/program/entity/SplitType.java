package com.ironmind.program.entity;

/**
 * Division of the training program.
 *
 * <p>The values mirror the {@code split_type} enum of the database (SPEC.md section 10.4).
 */
public enum SplitType {

    /**
     * Push, pull and legs: three days of training.
     */
    PPL,

    /**
     * Upper and lower body, alternating between the days.
     */
    UPPER_LOWER,

    /**
     * One full body session per training day.
     */
    FULL_BODY,

    /**
     * Free split, defined by the user.
     */
    CUSTOM,

    /**
     * Division by muscle group (ABCDE / Bro Split): one or two muscle groups per day.
     */
    ABCDE,

    /**
     * Classic three-day split grouping antagonists/synergists.
     */
    ABC,

    /**
     * Arnold Split: chest and back together, shoulders and arms, legs and abs.
     */
    ARNOLD_SPLIT,

    /**
     * PHUL (Power Hypertrophy Upper Lower): combines strength and hypertrophy focused days.
     */
    PHUL,

    /**
     * Hybrid split combining PPL and Upper/Lower (5 days).
     */
    HYBRID_PPL_UPPER_LOWER
}
