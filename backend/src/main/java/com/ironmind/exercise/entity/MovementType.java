package com.ironmind.exercise.entity;

/**
 * Kind of movement performed by the exercise.
 */
public enum MovementType {

    /**
     * Movement involving more than one muscle group, usually with free weights.
     */
    COMPOUND,

    /**
     * Movement targeting a single muscle group.
     */
    ISOLATION,

    /**
     * Cardiovascular movement.
     */
    CARDIO,

    /**
     * Movement without a measurable range of motion, such as a plank.
     */
    ISOMETRIC
}
