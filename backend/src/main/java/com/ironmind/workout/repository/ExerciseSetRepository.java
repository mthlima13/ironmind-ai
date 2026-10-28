package com.ironmind.workout.repository;

import com.ironmind.workout.entity.ExerciseSet;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the sets registered in the sessions.
 *
 * <p>The idempotency key lives in the set itself, in a field with a unique index: the mechanism
 * is durable and survives a restart of the server (SPEC.md section 7.8 and appendix A.3).
 */
@Repository
public interface ExerciseSetRepository extends MongoRepository<ExerciseSet, UUID> {

    /**
     * Lists the sets of a session exercise, ordered by the number of the set.
     */
    List<ExerciseSet> findBySessionExerciseIdOrderBySetNumberAsc(UUID sessionExerciseId);

    /**
     * Lists the sets of many session exercises, ordered by exercise and by number of the set.
     */
    List<ExerciseSet> findBySessionExerciseIdInOrderBySessionExerciseIdAscSetNumberAsc(
            Collection<UUID> sessionExerciseIds);

    /**
     * Finds a set by its idempotency key.
     */
    Optional<ExerciseSet> findByIdempotencyKey(String idempotencyKey);

    /**
     * Finds a set that belongs to a session of the given user.
     *
     * <p>The owner is part of the filter: a set of another user is reported as not found, so the
     * API never reveals the existence of foreign data (SPEC.md appendix A).
     */
    Optional<ExerciseSet> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Lists every set of the user for an exercise, in chronological order.
     */
    List<ExerciseSet> findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(UUID userId, UUID exerciseId);

    /**
     * Lists the sets of many sessions in a single round trip.
     */
    List<ExerciseSet> findBySessionIdIn(Collection<UUID> sessionIds);

    /**
     * Returns the set with the biggest number of the exercise of the session.
     */
    Optional<ExerciseSet> findFirstBySessionExerciseIdOrderBySetNumberDesc(UUID sessionExerciseId);
}
