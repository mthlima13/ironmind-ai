package com.ironmind.exercise.repository;

import com.ironmind.exercise.entity.Exercise;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the exercise catalog.
 *
 * <p>The queries that read private data are always filtered by owner, either here or in the
 * service layer, as required by SPEC.md section 3.4.
 */
@Repository
public interface ExerciseRepository extends MongoRepository<Exercise, UUID> {

    /**
     * Lists the exercises of the global catalog.
     */
    List<Exercise> findByCreatedByUserIdIsNull();

    /**
     * Lists the exercises of the global catalog, whatever the legacy owner field says.
     */
    List<Exercise> findBySystemTrue();

    /**
     * Lists the personal exercises of the given user.
     */
    List<Exercise> findByCreatedByUserId(UUID userId);

    /**
     * Finds an exercise by its identifier.
     */
    Optional<Exercise> findById(UUID id);
}
