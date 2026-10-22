package com.ironmind.workout.repository;

import com.ironmind.workout.entity.ExerciseSet;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the sets registered in the sessions.
 *
 * <p>The idempotency key lives in the set itself, in a column with a unique index: the
 * mechanism is durable and survives a restart of the server (SPEC.md section 7.8 and appendix
 * A.3).
 */
@Repository
public interface ExerciseSetRepository extends JpaRepository<ExerciseSet, UUID> {

    /**
     * Lists the sets of a session exercise, ordered by the number of the set.
     */
    List<ExerciseSet> findBySessionExerciseIdOrderBySetNumber(UUID sessionExerciseId);

    /**
     * Lists the sets of many session exercises, ordered by exercise and by number of the set.
     *
     * <p>The history brings the sets of the whole page in a single round trip, so the answer of
     * the API never triggers a lazy load per exercise.
     */
    @Query("select s from ExerciseSet s join fetch s.sessionExercise se where se.id in :sessionExerciseIds "
            + "order by se.id, s.setNumber")
    List<ExerciseSet> findBySessionExerciseIds(@Param("sessionExerciseIds") Collection<UUID> sessionExerciseIds);

    /**
     * Finds a set by its idempotency key.
     *
     * <p>The exercise of the session travels with the set, because the answer of the API carries
     * the series of every exercise of the session.
     */
    @Query("select s from ExerciseSet s join fetch s.sessionExercise se join fetch se.session sess "
            + "where s.idempotencyKey = :idempotencyKey")
    Optional<ExerciseSet> findByIdempotencyKey(@Param("idempotencyKey") String idempotencyKey);

    /**
     * Finds a set that belongs to a session of the given user.
     *
     * <p>The owner is part of the filter: a set of another user is reported as not found, so the
     * API never reveals the existence of foreign data (SPEC.md appendix A).
     */
    @Query("select s from ExerciseSet s join fetch s.sessionExercise se join fetch se.session sess "
            + "where s.id = :id and sess.user.id = :userId")
    Optional<ExerciseSet> findOwnedById(@Param("id") UUID id, @Param("userId") UUID userId);

    /**
     * Returns the biggest number of the set used by the exercise of the session.
     *
     * <p>The number of the set is the position of the series inside the exercise, so it is
     * assigned by the server and never comes from the body of the request.
     */
    @Query("select coalesce(max(s.setNumber), 0) from ExerciseSet s "
            + "where s.sessionExercise.id = :sessionExerciseId")
    int findMaxSetNumber(@Param("sessionExerciseId") UUID sessionExerciseId);
}
