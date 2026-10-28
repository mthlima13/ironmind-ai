package com.ironmind.user.service;

import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.user.dto.InjuryRestrictionResponse;
import com.ironmind.user.dto.UpdateRestrictionsRequest;
import com.ironmind.user.entity.InjuryRestriction;
import com.ironmind.user.repository.InjuryRestrictionRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Management of the injury restrictions of the user (SPEC.md section 10.11).
 *
 * <p>The restrictions are sensitive health data and only the owner can access them. The update
 * replaces the set of restrictions of the user as a whole.
 */
@Service
@Transactional(readOnly = true)
public class RestrictionService {

    private final InjuryRestrictionRepository restrictionRepository;

    public RestrictionService(InjuryRestrictionRepository restrictionRepository) {
        this.restrictionRepository = restrictionRepository;
    }

    /**
     * Lists the restrictions of the user.
     */
    public List<InjuryRestrictionResponse> list(UUID userId) {
        List<InjuryRestriction> restrictions = restrictionRepository.findByUserId(userId);
        List<InjuryRestrictionResponse> result = new ArrayList<>(restrictions.size());
        for (InjuryRestriction restriction : restrictions) {
            result.add(toResponse(restriction));
        }
        return result;
    }

    /**
     * Replaces the restrictions of the user.
     */
    @Transactional
    public List<InjuryRestrictionResponse> update(UUID userId,
            UpdateRestrictionsRequest request) {
        if (request == null || request.restrictions() == null) {
            throw new FieldValidationException("restrictions", "As restrições são obrigatórias.");
        }
        restrictionRepository.deleteByUserId(userId);
        List<InjuryRestrictionResponse> result = new ArrayList<>(request.restrictions().size());
        for (UpdateRestrictionsRequest.RestrictionRequest restriction : request.restrictions()) {
            String bodyRegion = restriction.bodyRegion() == null ? "" : restriction.bodyRegion().trim();
            String description = restriction.description() == null ? "" : restriction.description().trim();
            if (bodyRegion.isEmpty()) {
                throw new FieldValidationException("bodyRegion", "A região do corpo é obrigatória.");
            }
            if (description.isEmpty()) {
                throw new FieldValidationException("description", "A descrição é obrigatória.");
            }
            boolean active = restriction.isActive() == null || Boolean.TRUE.equals(restriction.isActive());
            List<UUID> exerciseIds = restriction.exerciseIds() == null ? List.of() : new ArrayList<>(restriction.exerciseIds());
            InjuryRestriction saved = restrictionRepository.save(new InjuryRestriction(
                    UUID.randomUUID(),
                    userId,
                    bodyRegion,
                    description,
                    active,
                    exerciseIds));
            result.add(toResponse(saved));
        }
        return result;
    }

    private static InjuryRestrictionResponse toResponse(InjuryRestriction restriction) {
        return new InjuryRestrictionResponse(
                restriction.getId(),
                restriction.getBodyRegion(),
                restriction.getDescription(),
                restriction.isActive(),
                new ArrayList<>(restriction.getExerciseIds()));
    }
}
