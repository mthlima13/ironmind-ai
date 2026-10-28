package com.ironmind.record.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Personal record of a user for an exercise.
 *
 * <p>There is at most one record per user, exercise and type. Records are recalculated
 * transactionally whenever a set changes, so an edited set can invalidate a record (SPEC.md
 * section 7.4).
 */
@Document(collection = "personal_records")
@CompoundIndex(name = "user_exercise_type", def = "{'userId': 1, 'exerciseId': 1, 'recordType': 1}",
        unique = true)
public class PersonalRecord {

    @Id
    private UUID id;

    private UUID userId;

    private UUID exerciseId;

    private RecordType recordType;

    private BigDecimal value;

    private String unit;

    /**
     * Set that achieved the record, {@code null} when the source set no longer exists.
     */
    private UUID sourceSetId;

    private Instant achievedAt;

    protected PersonalRecord() {
    }

    public PersonalRecord(UUID id, UUID userId, UUID exerciseId, RecordType recordType, BigDecimal value,
            String unit, UUID sourceSetId, Instant achievedAt) {
        this.id = id;
        this.userId = userId;
        this.exerciseId = exerciseId;
        this.recordType = recordType;
        this.value = value;
        this.unit = unit;
        this.sourceSetId = sourceSetId;
        this.achievedAt = achievedAt == null ? Instant.now() : achievedAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getExerciseId() {
        return exerciseId;
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

    public UUID getSourceSetId() {
        return sourceSetId;
    }

    public Instant getAchievedAt() {
        return achievedAt;
    }

    /**
     * Replaces the value of the record after a recalculation of the performed sets.
     *
     * <p>The recalculation happens inside the transaction of the change of the set, so a record
     * that no longer holds is deleted instead of being left stale (SPEC.md section 7.4).
     *
     * @param value       value in the canonical unit of the record type
     * @param unit        unit of the value
     * @param sourceSetId set that achieved the record, when it still exists
     * @param achievedAt  moment the value was first achieved
     */
    public void update(BigDecimal value, String unit, UUID sourceSetId, Instant achievedAt) {
        this.value = value;
        this.unit = unit;
        this.sourceSetId = sourceSetId;
        this.achievedAt = achievedAt;
    }
}
