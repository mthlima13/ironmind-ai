package com.ironmind.record.repository;

import com.ironmind.record.entity.PersonalRecord;
import com.ironmind.record.entity.RecordType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the personal records.
 */
@Repository
public interface PersonalRecordRepository extends JpaRepository<PersonalRecord, UUID> {

    /**
     * Lists the records of a user.
     */
    List<PersonalRecord> findByUserId(UUID userId);

    /**
     * Finds the record of a user for an exercise and a type.
     */
    Optional<PersonalRecord> findByUserIdAndExerciseIdAndRecordType(UUID userId, UUID exerciseId,
            RecordType recordType);

    /**
     * Lists a page of records of the user, with the exercise embedded.
     *
     * <p>The owner and the exercise travel in the same query, so the answer of the API never
     * triggers a lazy load per record.
     */
    @Query(value = "select r from PersonalRecord r join fetch r.exercise where r.user.id = :userId",
            countQuery = "select count(r) from PersonalRecord r where r.user.id = :userId")
    Page<PersonalRecord> findPageByUserId(@Param("userId") UUID userId, Pageable pageable);

    /**
     * Counts the records achieved by the user inside the period.
     */
    @Query("select count(r) from PersonalRecord r where r.user.id = :userId "
            + "and r.achievedAt >= :from and r.achievedAt < :to")
    long countAchievedBetween(@Param("userId") UUID userId, @Param("from") Instant from,
            @Param("to") Instant to);
}
