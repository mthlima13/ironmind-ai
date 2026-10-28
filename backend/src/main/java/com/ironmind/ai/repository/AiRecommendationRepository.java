package com.ironmind.ai.repository;

import com.ironmind.ai.entity.AiRecommendation;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the recommendations reviewed by the user.
 *
 * <p>Every read is filtered by the owner, so a recommendation of another user is reported as not
 * found instead of forbidden (SPEC.md appendix A).
 */
@Repository
public interface AiRecommendationRepository extends MongoRepository<AiRecommendation, UUID> {

    /**
     * Finds a recommendation that belongs to the given user.
     */
    Optional<AiRecommendation> findByIdAndUserId(UUID id, UUID userId);
}
