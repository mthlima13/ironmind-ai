package com.ironmind.record.entity;

import com.ironmind.exercise.entity.Exercise;
import com.ironmind.user.entity.User;
import com.ironmind.workout.entity.ExerciseSet;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Personal record of a user for an exercise.
 *
 * <p>There is at most one record per user, exercise and type. Records are recalculated
 * transactionally whenever a set changes, so an edited set can invalidate a record (SPEC.md
 * section 7.4).
 */
@Entity
@Table(name = "personal_records")
public class PersonalRecord {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "record_type", nullable = false)
    private RecordType recordType;

    @Column(name = "value", nullable = false, precision = 8, scale = 2)
    private BigDecimal value;

    @Column(name = "unit", nullable = false, length = 16)
    private String unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_set_id")
    private ExerciseSet sourceSet;

    @Column(name = "achieved_at", nullable = false)
    private Instant achievedAt;

    protected PersonalRecord() {
    }

    public PersonalRecord(UUID id, User user, Exercise exercise, RecordType recordType, BigDecimal value, String unit,
            ExerciseSet sourceSet, Instant achievedAt) {
        this.id = id;
        this.user = user;
        this.exercise = exercise;
        this.recordType = recordType;
        this.value = value;
        this.unit = unit;
        this.sourceSet = sourceSet;
        this.achievedAt = achievedAt == null ? Instant.now() : achievedAt;
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public RecordType getRecordType() {
        return recordType;
    }

    public BigDecimal getValue() {
        return value;
    }

    public String getUnit() {
        return unit;
    }

    public ExerciseSet getSourceSet() {
        return sourceSet;
    }

    public Instant getAchievedAt() {
        return achievedAt;
    }
}
