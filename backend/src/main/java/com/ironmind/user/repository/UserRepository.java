package com.ironmind.user.repository;

import com.ironmind.user.entity.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the accounts.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Finds an account by its e-mail, used by the authentication flow planned for Sprint 2.
     */
    Optional<User> findByEmailIgnoreCase(String email);
}
