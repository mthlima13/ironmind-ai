package com.ironmind.user.repository;

import com.ironmind.user.entity.InjuryRestriction;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the injury restrictions.
 */
@Repository
public interface InjuryRestrictionRepository extends JpaRepository<InjuryRestriction, UUID> {

    /**
     * Lists all restrictions of the user.
     */
    List<InjuryRestriction> findByUserId(UUID userId);

    /**
     * Removes every restriction of the user so they can be replaced as a whole.
     */
    @Modifying
    @Query("delete from InjuryRestriction r where r.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
