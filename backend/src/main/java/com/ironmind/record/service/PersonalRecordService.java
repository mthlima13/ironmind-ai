package com.ironmind.record.service;

import com.ironmind.common.web.PageResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.record.dto.PersonalRecordResponse;
import com.ironmind.record.entity.PersonalRecord;
import com.ironmind.record.entity.RecordType;
import com.ironmind.record.repository.PersonalRecordRepository;
import com.ironmind.user.repository.UserRepository;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.service.OneRepMaxCalculator;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Detection and recalculation of the personal records (SPEC.md section 7.4).
 *
 * <p>The records are always derived from the performed sets. Whenever a set is created, corrected
 * or deleted, the whole set of the user for the exercise is evaluated again inside the same
 * transaction: a corrected or deleted set never leaves a stale record behind.
 *
 * <p>The rules follow the derived queries documented in {@code docs/DATA-MODEL.md}:
 *
 * <ul>
 *   <li>{@code MAX_WEIGHT}: highest positive external load;
 *   <li>{@code MAX_REPS_AT_WEIGHT}: highest number of repetitions performed with an external load
 *       (including zero), which keeps the record comparable between sessions;
 *   <li>{@code BEST_ESTIMATED_1RM}: highest Brzycki estimate of the sets.
 * </ul>
 *
 * <p>Bodyweight sets ({@code weightKg == null}) do not produce records of load: there is no
 * external load to compare, which is the same boundary used by the volume (decision 5).
 */
@Service
public class PersonalRecordService {

    /**
     * Unit of the record of load.
     */
    public static final String WEIGHT_UNIT = "kg";

    /**
     * Unit of the record of repetitions.
     */
    public static final String REPS_UNIT = "reps";

    /**
     * Unit of the record of estimated one repetition maximum.
     */
    public static final String ESTIMATED_ONE_REP_MAX_UNIT = "kg (estimado)";

    private final PersonalRecordRepository recordRepository;
    private final ExerciseSetRepository exerciseSetRepository;
    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;
    private final OneRepMaxCalculator oneRepMaxCalculator;

    public PersonalRecordService(PersonalRecordRepository recordRepository,
            ExerciseSetRepository exerciseSetRepository, UserRepository userRepository,
            ExerciseRepository exerciseRepository, OneRepMaxCalculator oneRepMaxCalculator) {
        this.recordRepository = recordRepository;
        this.exerciseSetRepository = exerciseSetRepository;
        this.userRepository = userRepository;
        this.exerciseRepository = exerciseRepository;
        this.oneRepMaxCalculator = oneRepMaxCalculator;
    }

    /**
     * Lists a page of records of the user, newest achievement first.
     */
    @Transactional(readOnly = true)
    public PageResponse<PersonalRecordResponse> list(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "achievedAt"));
        Page<PersonalRecord> records = recordRepository.findPageByUserId(userId, pageable);
        return PageResponse.of(records, PersonalRecordResponse::from);
    }

    /**
     * Recalculates every record of the user for an exercise from the sets that still exist.
     *
     * <p>The method runs inside the transaction of the change of the set, so a failure to evaluate
     * the records rolls the change back (SPEC.md section 7.4).
     *
     * @param userId     owner of the data, always taken from the access token
     * @param exerciseId exercise whose records are recalculated
     */
    @Transactional
    public void recalculate(UUID userId, UUID exerciseId) {
        List<ExerciseSet> sets = exerciseSetRepository.findByUserIdAndExerciseId(userId, exerciseId);
        Map<RecordType, Achievement> best = new EnumMap<>(RecordType.class);

        for (ExerciseSet set : sets) {
            consider(best, RecordType.MAX_WEIGHT, maxWeight(set), WEIGHT_UNIT, set);
            BigDecimal repsAtWeight = repsAtWeight(set);
            if (repsAtWeight != null) {
                consider(best, RecordType.MAX_REPS_AT_WEIGHT, repsAtWeight, REPS_UNIT, set);
            }
            oneRepMaxCalculator.estimate(set.getWeightKg(), set.getRepetitions())
                    .ifPresent(value -> consider(best, RecordType.BEST_ESTIMATED_1RM, value,
                            ESTIMATED_ONE_REP_MAX_UNIT, set));
        }

        for (RecordType type : RecordType.values()) {
            Optional<PersonalRecord> current = recordRepository
                    .findByUserIdAndExerciseIdAndRecordType(userId, exerciseId, type);
            Achievement achievement = best.get(type);
            if (achievement == null) {
                current.ifPresent(recordRepository::delete);
            } else if (current.isPresent()) {
                current.get().update(achievement.value(), achievement.unit(),
                        achievement.sourceSet(), achievement.achievedAt());
            } else {
                recordRepository.save(new PersonalRecord(
                        UUID.randomUUID(),
                        userRepository.getReferenceById(userId),
                        exerciseRepository.getReferenceById(exerciseId),
                        type,
                        achievement.value(),
                        achievement.unit(),
                        achievement.sourceSet(),
                        achievement.achievedAt()));
            }
        }
    }

    /**
     * Keeps the best achievement of a type.
     *
     * <p>The sets arrive in chronological order, so a tie keeps the first moment the value was
     * achieved instead of moving the record to a later repetition of the same result.
     */
    private static void consider(Map<RecordType, Achievement> best, RecordType type, BigDecimal value,
            String unit, ExerciseSet set) {
        if (value == null) {
            return;
        }
        Achievement current = best.get(type);
        if (current == null || value.compareTo(current.value()) > 0) {
            best.put(type, new Achievement(value, unit, set, set.getCompletedAt()));
        }
    }

    /**
     * Highest positive external load of the set, or {@code null} when there is none.
     */
    private static BigDecimal maxWeight(ExerciseSet set) {
        BigDecimal weight = set.getWeightKg();
        return weight == null || weight.signum() <= 0 ? null : weight;
    }

    /**
     * Repetitions of the set when it carries an external load, or {@code null} otherwise.
     */
    private static BigDecimal repsAtWeight(ExerciseSet set) {
        BigDecimal weight = set.getWeightKg();
        if (weight == null || weight.signum() < 0 || set.getRepetitions() <= 0) {
            return null;
        }
        return BigDecimal.valueOf(set.getRepetitions());
    }

    /**
     * Achievement of a record type before it is persisted.
     */
    private record Achievement(BigDecimal value, String unit, ExerciseSet sourceSet, Instant achievedAt) {
    }
}
