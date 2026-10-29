package com.ironmind.program.entity;

import java.util.Set;

/**
 * Division of the training program.
 *
 * <p>The values mirror the {@code splitType} field of the program document (SPEC.md section 10.4).
 * The splits whose name already tells the number of days (AB, ABC, ABCD, ABCDE) also enforce that
 * number: a program declared as ABC with two days is rejected, because the label would lie about
 * its own structure.
 */
public enum SplitType {

    /**
     * Push, pull and legs: three or six days of training.
     */
    PPL,

    /**
     * Upper and lower body, alternating between two or four days.
     */
    UPPER_LOWER,

    /**
     * One full body session per training day, from one to six days.
     */
    FULL_BODY,

    /**
     * Two days: A, upper body, and B, lower body.
     */
    AB,

    /**
     * Classic three-day split grouping antagonists/synergists.
     */
    ABC,

    /**
     * Four days: chest and triceps, back and biceps, legs and glutes, shoulders and arms.
     */
    ABCD,

    /**
     * Division by muscle group (ABCDE / Bro Split): one or two muscle groups per day.
     */
    ABCDE,

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
    HYBRID_PPL_UPPER_LOWER,

    /**
     * Free split, defined by the user.
     */
    CUSTOM;

    /**
     * Returns the day counts accepted by the split.
     *
     * <p>An empty set means the split does not constrain the number of days: the structure is
     * whatever the user built, which is exactly the meaning of {@link #CUSTOM}.
     */
    public Set<Integer> supportedDayCounts() {
        return switch (this) {
            case AB -> Set.of(2);
            case ABC -> Set.of(3);
            case ABCD -> Set.of(4);
            case ABCDE -> Set.of(5);
            case UPPER_LOWER -> Set.of(2, 4);
            case PPL -> Set.of(3, 6);
            case PHUL -> Set.of(4);
            case ARNOLD_SPLIT -> Set.of(3);
            case HYBRID_PPL_UPPER_LOWER -> Set.of(5);
            case FULL_BODY -> Set.of(1, 2, 3, 4, 5, 6);
            case CUSTOM -> Set.of();
        };
    }

    /**
     * Tells whether the split accepts a program with the given number of days.
     */
    public boolean acceptsDayCount(int dayCount) {
        Set<Integer> supported = supportedDayCounts();
        return supported.isEmpty() || supported.contains(dayCount);
    }
}
