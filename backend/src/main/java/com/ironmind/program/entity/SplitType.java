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
    CUSTOM
}
