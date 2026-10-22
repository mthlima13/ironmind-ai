package com.ironmind.workout.repository;

import com.ironmind.workout.entity.WorkoutSession;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the training sessions.
 *
 * <p>Every query of a private resource is filtered by the owner, as required by SPEC.md
 * section 3.4: the session of another user is never read.
 */
@Repository
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {

    /**
     * Lists the sessions of the user, with the order of the request.
     *
     * <p>The history is the main use of this query: the mobile application shows the sessions
     * with the exercises and the sets embedded.
     */
    @Query("select s from WorkoutSession s where s.user.id = :userId")
    Page<WorkoutSession> findByUserId(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Finds a session that belongs to the given user.
     *
     * <p>The owner is part of the filter: a session of another user is reported as not found, so
     * the API never reveals the existence of foreign data (SPEC.md appendix A).
     */
    @Query("select s from WorkoutSession s join fetch s.user where s.id = :id and s.user.id = :userId")
    Optional<WorkoutSession> findOwnedById(@Param("id") UUID id, @Param("userId") UUID userId);
}
