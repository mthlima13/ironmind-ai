package com.ironmind.program.repository;

import com.ironmind.program.entity.WorkoutProgram;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the training programs.
 *
 * <p>Every query of a private resource is filtered by the owner, as required by SPEC.md
 * section 3.4.
 */
@Repository
public interface WorkoutProgramRepository extends MongoRepository<WorkoutProgram, UUID> {

    /**
     * Lists the programs of the user that are not archived.
     */
    Page<WorkoutProgram> findByUserIdAndArchivedFalse(UUID userId, Pageable pageable);

    /**
     * Lists every program of the user, including the archived ones.
     */
    Page<WorkoutProgram> findByUserId(UUID userId, Pageable pageable);

    /**
     * Finds a program that belongs to the given user.
     */
    Optional<WorkoutProgram> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Tells whether the program exists and belongs to the given user.
     *
     * <p>Used to link a reviewed AI proposal to the program the user saved, without ever
     * revealing the program of another user.
     */
    boolean existsByIdAndUserId(UUID id, UUID userId);
}
