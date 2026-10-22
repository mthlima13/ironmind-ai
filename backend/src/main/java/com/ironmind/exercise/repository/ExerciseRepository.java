package com.ironmind.exercise.repository;

import com.ironmind.exercise.entity.Exercise;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository of the exercise catalog.
 *
 * <p>The queries that read private data are always filtered by owner, either here or in the
 * service layer, as required by SPEC.md section 3.4.
 */
@Repository
public interface ExerciseRepository extends JpaRepository<Exercise, UUID>, JpaSpecificationExecutor<Exercise> {
}
