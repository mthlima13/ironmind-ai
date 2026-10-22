package com.ironmind.workout.repository;

import com.ironmind.workout.entity.WorkoutSession;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the training sessions.
 */
@Repository
public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, UUID> {
}
