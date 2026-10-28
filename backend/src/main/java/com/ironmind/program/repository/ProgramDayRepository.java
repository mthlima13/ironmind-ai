package com.ironmind.program.repository;

import com.ironmind.program.entity.ProgramDay;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the training days.
 */
@Repository
public interface ProgramDayRepository extends MongoRepository<ProgramDay, UUID> {

    /**
     * Returns the days of a program, ordered by position.
     */
    List<ProgramDay> findByProgramIdOrderByPositionAsc(UUID programId);

    /**
     * Returns the days of many programs, ordered by program and by position.
     */
    List<ProgramDay> findByProgramIdInOrderByProgramIdAscPositionAsc(Collection<UUID> programIds);

    /**
     * Removes every day of a program.
     */
    void deleteByProgramId(UUID programId);
}
