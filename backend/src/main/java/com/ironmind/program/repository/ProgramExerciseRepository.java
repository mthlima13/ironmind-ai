package com.ironmind.program.repository;

import com.ironmind.program.entity.ProgramExercise;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the exercises of the program days.
 *
 * <p>The read queries bring the exercise of the catalog in the same round trip, because the
 * answer of the API carries the exercise of every entry of the program.
 */
@Repository
public interface ProgramExerciseRepository extends JpaRepository<ProgramExercise, UUID> {

    /**
     * Returns the exercises of the days of a program, ordered by the position of the day and by
     * the position of the exercise.
     */
    @Query("select pe from ProgramExercise pe join pe.day d join fetch pe.exercise "
            + "where d.program.id = :programId order by d.position, pe.position")
    List<ProgramExercise> findByProgramId(@Param("programId") UUID programId);

    /**
     * Returns the exercises of the days of many programs, ordered by program, by the position of
     * the day and by the position of the exercise.
     */
    @Query("select pe from ProgramExercise pe join pe.day d join fetch pe.exercise "
            + "where d.program.id in :programIds order by d.program.id, d.position, pe.position")
    List<ProgramExercise> findByProgramIds(@Param("programIds") Collection<UUID> programIds);

    /**
     * Removes every exercise of every day of a program.
     *
     * <p>The update of a program replaces the whole structure, so the old entries are removed
     * before the new ones are written. The statement is native because a bulk operation cannot
     * rely on the persistence context.
     */
    @Modifying
    @Query(value = "DELETE FROM program_exercises WHERE program_day_id IN "
            + "(SELECT id FROM program_days WHERE program_id = :programId)", nativeQuery = true)
    void deleteAllByProgramId(@Param("programId") UUID programId);
}
