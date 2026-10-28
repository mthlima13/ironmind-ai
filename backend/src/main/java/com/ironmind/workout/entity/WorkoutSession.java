package com.ironmind.workout.entity;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Training session performed by a user.
 *
 * <p>The session keeps the snapshot of what was performed: changing or deleting a program never
 * changes a session that already happened (SPEC.md section 7.6).
 *
 * <p>The program references are plain identifiers: the session keeps the snapshot of what was
 * performed, so changing or deleting a program never changes a session that already happened
 * (SPEC.md section 7.6).
 */
@Document(collection = "workout_sessions")
@CompoundIndex(name = "user_started", def = "{'userId': 1, 'startedAt': -1}")
@CompoundIndex(name = "user_status_completed", def = "{'userId': 1, 'status': 1, 'completedAt': -1}")
public class WorkoutSession {

    @Id
    private UUID id;

    /**
     * Owner of the session, always taken from the gateway header.
     */
    private UUID userId;

    private UUID programId;

    private UUID programDayId;

    private Instant startedAt;

    private Instant completedAt;

    private SessionStatus status = SessionStatus.IN_PROGRESS;

    private String notes;

    private Instant createdAt;

    protected WorkoutSession() {
    }

    public WorkoutSession(UUID id, UUID userId, UUID programId, UUID programDayId, Instant startedAt,
            SessionStatus status) {
        this.id = id;
        this.userId = userId;
        this.programId = programId;
        this.programDayId = programDayId;
        this.startedAt = startedAt == null ? Instant.now() : startedAt;
        this.status = status == null ? SessionStatus.IN_PROGRESS : status;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getProgramId() {
        return programId;
    }

    public UUID getProgramDayId() {
        return programDayId;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /**
     * Tells whether the session belongs to the given user.
     *
     * <p>The owner always comes from the header injected by the gateway, so this check is the
     * boundary that keeps the data of one user away from the other (SPEC.md section 3.4).
     */
    public boolean isOwnedBy(UUID userId) {
        return userId != null && this.userId != null && userId.equals(this.userId);
    }

    /**
     * Tells whether the session was finished.
     *
     * <p>A finished session is immutable: it accepts no new sets, no correction of the existing
     * ones and no change of state (SPEC.md section 7.8).
     */
    public boolean isFinalized() {
        return status == SessionStatus.COMPLETED || status == SessionStatus.ABANDONED;
    }

    /**
     * Interrupts the session, which can be resumed later.
     */
    public void pause() {
        this.status = SessionStatus.PAUSED;
    }

    /**
     * Resumes a paused session.
     */
    public void resume() {
        this.status = SessionStatus.IN_PROGRESS;
    }

    /**
     * Gives the session up. The state is final: the session never goes back.
     */
    public void abandon() {
        this.status = SessionStatus.ABANDONED;
    }

    /**
     * Finishes the session and stamps the moment it ended.
     */
    public void complete(Instant completedAt) {
        this.status = SessionStatus.COMPLETED;
        this.completedAt = completedAt == null ? Instant.now() : completedAt;
    }

    /**
     * Replaces the observations of the session.
     */
    public void updateNotes(String notes) {
        this.notes = notes;
    }
}
