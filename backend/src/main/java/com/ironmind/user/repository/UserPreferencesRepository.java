package com.ironmind.user.repository;

import com.ironmind.user.entity.UserPreferences;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the user preferences.
 */
@Repository
public interface UserPreferencesRepository extends JpaRepository<UserPreferences, UUID> {

    /**
     * Finds the preferences of a user.
     */
    Optional<UserPreferences> findByUserId(UUID userId);
}
