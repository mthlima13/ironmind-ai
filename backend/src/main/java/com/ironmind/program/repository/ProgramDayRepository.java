package com.ironmind.program.repository;

import com.ironmind.program.entity.ProgramDay;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the training days.
 *
 * <p>The read queries bring the days of the programs in a single round trip, so the answer of
 * the API never triggers a lazy load outside a transaction.
 */
@Repository
public interface ProgramDayRepository extends JpaRepository<ProgramDay, UUID> {

    /**
     * Returns the days of a program, ordered by position.
     */
    @Query("select d from ProgramDay d where d.program.id = :programId order by d.position")
    List<ProgramDay> findByProgramId(@Param("programId") UUID programId);

    /**
     * Returns the days of many programs, ordered by program and by position.
     */
    @Query("select d from ProgramDay d where d.program.id in :programIds order by d.program.id, d.position")
    List<ProgramDay> findByProgramIds(@Param("programIds") Collection<UUID> programIds);

    /**
     * Removes every day of a program.
     *
     * <p>The statement is native because the exercises of the day are removed by the cascade of
     * the database, and a bulk operation cannot rely on the persistence context.
     */
    @Modifying
    @Query(value = "DELETE FROM program_days WHERE program_id = :programId", nativeQuery = true)
    void deleteAllByProgramId(@Param("programId") UUID programId);
}
