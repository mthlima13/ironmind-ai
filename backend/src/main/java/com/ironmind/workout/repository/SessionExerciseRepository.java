package com.ironmind.workout.repository;

import com.ironmind.workout.entity.SessionExercise;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the exercises performed inside the sessions.
 *
 * <p>Every query of a private resource is filtered by the owner, as required by SPEC.md
 * section 3.4: the exercise of a session of another user is never read.
 */
@Repository
public interface SessionExerciseRepository extends JpaRepository<SessionExercise, UUID> {

    /**
     * Lists the exercises of a session, ordered by their position.
     *
     * <p>The exercise of the catalog travels with the entry, because the answer of the API
     * carries the exercise of every entry of the session.
     */
    @Query("select se from SessionExercise se join fetch se.exercise where se.session.id = :sessionId "
            + "order by se.position")
    List<SessionExercise> findBySessionIdOrderByPosition(@Param("sessionId") UUID sessionId);

    /**
     * Lists the exercises of many sessions, ordered by session and by position.
     *
     * <p>The history brings the exercises of the whole page in a single round trip, so the answer
     * of the API never triggers a lazy load per session.
     */
    @Query("select se from SessionExercise se join fetch se.exercise where se.session.id in :sessionIds "
            + "order by se.session.id, se.position")
    List<SessionExercise> findBySessionIds(@Param("sessionIds") Collection<UUID> sessionIds);

    /**
     * Finds an exercise that belongs to the given session.
     *
     * <p>The session is part of the filter: an exercise of another session is reported as not
     * found, so the API never reveals the existence of foreign data.
     */
    @Query("select se from SessionExercise se where se.id = :id and se.session.id = :sessionId")
    Optional<SessionExercise> findByIdAndSessionId(@Param("id") UUID id, @Param("sessionId") UUID sessionId);

    /**
     * Tells whether the exercise is already part of the session.
     */
    boolean existsBySessionIdAndExerciseId(UUID sessionId, UUID exerciseId);

    /**
     * Tells whether the session already has an exercise in the given position.
     */
    boolean existsBySessionIdAndPosition(UUID sessionId, int position);

    /**
     * Returns the biggest position used by the exercises of the session.
     */
    @Query("select coalesce(max(se.position), 0) from SessionExercise se where se.session.id = :sessionId")
    int findMaxPosition(@Param("sessionId") UUID sessionId);
}
