package com.ironmind.user.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/**
 * Payload to replace the restrictions of the user.
 */
public record UpdateRestrictionsRequest(
        @NotNull(message = "As restrições são obrigatórias.")
        @Valid
        List<RestrictionRequest> restrictions) {

    /**
     * Restriction to create or update.
     *
     * @param bodyRegion  body region affected
     * @param description description of the limitation
     * @param isActive    whether the restriction is active
     * @param exerciseIds exercises the user asked to avoid
     */
    public record RestrictionRequest(
            String bodyRegion,
            String description,
            Boolean isActive,
            List<java.util.UUID> exerciseIds) {
    }
}
