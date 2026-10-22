package com.ironmind.workout.repository;

import com.ironmind.workout.entity.SessionExercise;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the exercises performed inside a session.
 */
@Repository
public interface SessionExerciseRepository extends JpaRepository<SessionExercise, UUID> {

    /**
     * Lists the exercises of a session, ordered by their position.
     */
    List<SessionExercise> findBySessionIdOrderByPosition(UUID sessionId);
}
