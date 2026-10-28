package com.ironmind.user.repository;

import com.ironmind.user.entity.InjuryRestriction;
import java.util.List;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the injury restrictions.
 */
@Repository
public interface InjuryRestrictionRepository extends MongoRepository<InjuryRestriction, UUID> {

    /**
     * Lists all restrictions of the user.
     */
    List<InjuryRestriction> findByUserId(UUID userId);

    /**
     * Removes every restriction of the user so they can be replaced as a whole.
     */
    void deleteByUserId(UUID userId);
}
