package com.ironmind.workout.repository;

import com.ironmind.workout.entity.SessionExercise;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the exercises performed inside the sessions.
 *
 * <p>Every query of a private resource is filtered by the owner, as required by SPEC.md
 * section 3.4: the exercise of a session of another user is never read.
 */
@Repository
public interface SessionExerciseRepository extends MongoRepository<SessionExercise, UUID> {

    /**
     * Lists the exercises of a session, ordered by their position.
     */
    List<SessionExercise> findBySessionIdOrderByPositionAsc(UUID sessionId);

    /**
     * Lists the exercises of many sessions, ordered by session and by position.
     */
    List<SessionExercise> findBySessionIdInOrderBySessionIdAscPositionAsc(Collection<UUID> sessionIds);

    /**
     * Finds an exercise that belongs to the given session.
     *
     * <p>The session is part of the filter: an exercise of another session is reported as not
     * found, so the API never reveals the existence of foreign data.
     */
    Optional<SessionExercise> findByIdAndSessionId(UUID id, UUID sessionId);

    /**
     * Tells whether the exercise is already part of the session.
     */
    boolean existsBySessionIdAndExerciseId(UUID sessionId, UUID exerciseId);

    /**
     * Tells whether the session already has an exercise in the given position.
     */
    boolean existsBySessionIdAndPosition(UUID sessionId, int position);

    /**
     * Returns the exercise of the session with the biggest position.
     */
    Optional<SessionExercise> findFirstBySessionIdOrderByPositionDesc(UUID sessionId);
}
