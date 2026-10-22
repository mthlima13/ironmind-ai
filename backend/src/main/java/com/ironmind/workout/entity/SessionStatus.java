package com.ironmind.workout.entity;

/**
 * Life cycle of a workout session.
 */
public enum SessionStatus {

    /**
     * The session is running.
     */
    IN_PROGRESS,

    /**
     * The session is temporarily interrupted.
     */
    PAUSED,

    /**
     * The session was finished.
     */
    COMPLETED,

    /**
     * The session was given up.
     */
    ABANDONED
}
