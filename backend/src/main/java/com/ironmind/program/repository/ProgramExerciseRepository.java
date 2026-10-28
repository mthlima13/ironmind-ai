package com.ironmind.program.repository;

import com.ironmind.program.entity.ProgramExercise;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the exercises of the program days.
 *
 * <p>The answer of the API carries the exercise of every entry of the program; the exercises of
 * the catalog are loaded once per request by the service layer.
 */
@Repository
public interface ProgramExerciseRepository extends MongoRepository<ProgramExercise, UUID> {

    /**
     * Returns the exercises of the days of a program, in the order they were written.
     */
    List<ProgramExercise> findByProgramId(UUID programId);

    /**
     * Returns the exercises of many programs.
     */
    List<ProgramExercise> findByProgramIdIn(Collection<UUID> programIds);

    /**
     * Returns the exercises of a day, ordered by position.
     */
    List<ProgramExercise> findByDayIdOrderByPositionAsc(UUID dayId);

    /**
     * Removes every exercise of every day of a program.
     *
     * <p>The update of a program replaces the whole structure, so the old entries are removed
     * before the new ones are written.
     */
    void deleteByProgramId(UUID programId);
}
