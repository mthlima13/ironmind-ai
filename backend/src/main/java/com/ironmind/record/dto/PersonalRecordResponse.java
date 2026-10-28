package com.ironmind.record.dto;

import com.ironmind.exercise.entity.Exercise;
import com.ironmind.record.entity.PersonalRecord;
import com.ironmind.record.entity.RecordType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Representation of a personal record returned by the API (SPEC.md section 10.10).
 *
 * @param id           identifier of the record
 * @param exerciseId   exercise the record belongs to
 * @param exerciseName name of the exercise, so the client does not need a second request
 * @param recordType   kind of record
 * @param value        value in the canonical unit of the type
 * @param unit         unit of the value: {@code kg}, {@code reps} or {@code kg (estimado)}
 * @param achievedAt   moment the value was achieved
 */
public record PersonalRecordResponse(
        UUID id,
        UUID exerciseId,
        String exerciseName,
        RecordType recordType,
        BigDecimal value,
        String unit,
        Instant achievedAt) {

    /**
     * Maps the entity into the API representation.
     */
    public static PersonalRecordResponse from(PersonalRecord record, Exercise exercise) {
        return new PersonalRecordResponse(
                record.getId(),
                record.getExerciseId(),
                exercise.getName(),
                record.getRecordType(),
                record.getValue(),
                record.getUnit(),
                record.getAchievedAt());
    }
}
