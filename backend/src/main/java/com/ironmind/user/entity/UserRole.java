package com.ironmind.user.entity;

/**
 * Role of an account.
 *
 * <p>The administrator role is never decided by a boolean flag in the {@code users} table and it
 * is not part of the public MVP.
 */
public enum UserRole {

    /**
     * Regular user: manages only their own data.
     */
    USER,

    /**
     * Program creator: available from a future phase.
     */
    CREATOR,

    /**
     * Administrator: manages the catalog and the moderation queue.
     */
    ADMIN
}
