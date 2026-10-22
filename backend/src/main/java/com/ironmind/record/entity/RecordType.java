package com.ironmind.record.entity;

/**
 * Kinds of personal record supported by the product (SPEC.md section 7.4).
 */
public enum RecordType {

    /**
     * Highest load ever performed on the exercise.
     */
    MAX_WEIGHT,

    /**
     * Highest number of repetitions performed on a given load.
     */
    MAX_REPS_AT_WEIGHT,

    /**
     * Best estimated one repetition maximum.
     */
    BEST_ESTIMATED_1RM
}
