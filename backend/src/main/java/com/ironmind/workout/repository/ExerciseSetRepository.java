package com.ironmind.workout.repository;

import com.ironmind.workout.entity.ExerciseSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the sets registered in the sessions.
 */
@Repository
public interface ExerciseSetRepository extends JpaRepository<ExerciseSet, UUID> {

    /**
     * Lists the sets of a session exercise, ordered by the number of the set.
     */
    List<ExerciseSet> findBySessionExerciseIdOrderBySetNumber(UUID sessionExerciseId);

    /**
     * Finds a set by its idempotency key.
     */
    Optional<ExerciseSet> findByIdempotencyKey(String idempotencyKey);
}
