package com.ironmind.ai.entity;

/**
 * Lifecycle of a recommendation (SPEC.md section 10.13).
 *
 * <p>The names must match the PostgreSQL enum {@code recommendation_status} exactly. The decision
 * is always made by the user: the backend only moves a recommendation out of {@code PENDING} when
 * the owner accepts, edits or rejects it (SPEC.md section 12.2, step 8).
 */
public enum RecommendationStatus {

    /**
     * Waiting for the review of the user.
     */
    PENDING,

    /**
     * Accepted by the user without changes.
     */
    ACCEPTED,

    /**
     * Accepted by the user after changes.
     */
    EDITED,

    /**
     * Rejected by the user.
     */
    REJECTED,

    /**
     * Kept for compatibility with the enum of the database: a recommendation is never persisted
     * in this state by the API.
     */
    ERROR
}
