package com.ironmind.record.repository;

import com.ironmind.record.entity.PersonalRecord;
import com.ironmind.record.entity.RecordType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the personal records.
 */
@Repository
public interface PersonalRecordRepository
        extends MongoRepository<PersonalRecord, UUID>, PersonalRecordRepositoryCustom {

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
     * Lists a page of records of the user.
     */
    Page<PersonalRecord> findByUserId(UUID userId, Pageable pageable);
}
