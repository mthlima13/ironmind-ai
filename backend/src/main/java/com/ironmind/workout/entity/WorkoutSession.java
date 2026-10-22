package com.ironmind.workout.entity;

import com.ironmind.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Training session performed by a user.
 *
 * <p>The session keeps the snapshot of what was performed: changing or deleting a program never
 * changes a session that already happened (SPEC.md section 7.6).
 *
 * <p>The program references are plain identifiers: the session keeps the snapshot of what was
 * performed, so changing or deleting a program never changes a session that already happened
 * (SPEC.md section 7.6). The foreign keys are kept by the database.
 */
@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "program_id")
    private UUID programId;

    @Column(name = "program_day_id")
    private UUID programDayId;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status = SessionStatus.IN_PROGRESS;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WorkoutSession() {
    }

    public WorkoutSession(UUID id, User user, UUID programId, UUID programDayId, Instant startedAt, SessionStatus status) {
        this.id = id;
        this.user = user;
        this.programId = programId;
        this.programDayId = programDayId;
        this.startedAt = startedAt == null ? Instant.now() : startedAt;
        this.status = status == null ? SessionStatus.IN_PROGRESS : status;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
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
     * <p>The owner always comes from the access token, so this check is the boundary that keeps
     * the data of one user away from the other (SPEC.md section 3.4).
     */
    public boolean isOwnedBy(UUID userId) {
        return userId != null && user != null && userId.equals(user.getId());
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
