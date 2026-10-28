package com.ironmind.workout.repository;

import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * Repository of the training sessions.
 *
 * <p>Every query of a private resource is filtered by the owner, as required by SPEC.md
 * section 3.4: the session of another user is never read.
 */
@Repository
public interface WorkoutSessionRepository extends MongoRepository<WorkoutSession, UUID> {

    /**
     * Lists the sessions of the user, with the order of the request.
     */
    Page<WorkoutSession> findByUserId(UUID userId, Pageable pageable);

    /**
     * Finds a session that belongs to the given user.
     *
     * <p>The owner is part of the filter: a session of another user is reported as not found, so
     * the API never reveals the existence of foreign data (SPEC.md appendix A).
     */
    Optional<WorkoutSession> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Lists the completed sessions of the user whose completion falls inside the period.
     *
     * <p>The interval is half-open ({@code [from, to)}) and both bounds are written in a single
     * query: a derived name with two conditions on {@code completedAt} would make Spring Data
     * overwrite the first operator with the second. The order comes from the {@code Sort}, because
     * the {@code OrderBy} of the method name is ignored when {@code @Query} is present.
     */
    @Query("{ 'userId': ?0, 'status': ?1, 'completedAt': { $gte: ?2, $lt: ?3 } }")
    List<WorkoutSession> findCompletedBetween(UUID userId, SessionStatus status, Instant from,
            Instant to, Sort sort);

    /**
     * Finds the last completed session of the user.
     */
    Optional<WorkoutSession> findFirstByUserIdAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
            UUID userId, SessionStatus status);

    /**
     * Counts the completed sessions of the user after the given instant.
     */
    long countByUserIdAndStatusAndCompletedAtAfter(UUID userId, SessionStatus status, Instant from);
}
