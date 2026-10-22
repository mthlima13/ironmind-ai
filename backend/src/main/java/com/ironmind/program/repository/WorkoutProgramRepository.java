package com.ironmind.program.repository;

import com.ironmind.program.entity.WorkoutProgram;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the training programs.
 *
 * <p>Every query of a private resource is filtered by the owner, as required by SPEC.md
 * section 3.4.
 */
@Repository
public interface WorkoutProgramRepository extends JpaRepository<WorkoutProgram, UUID> {

    /**
     * Lists the programs of the user that are not archived.
     */
    @Query("select p from WorkoutProgram p where p.user.id = :userId and p.archived = false")
    Page<WorkoutProgram> findActiveByUser(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Lists every program of the user, including the archived ones.
     */
    @Query("select p from WorkoutProgram p where p.user.id = :userId")
    Page<WorkoutProgram> findAllByUser(@Param("userId") UUID userId, Pageable pageable);
}
