package com.ironmind.user.dto;

import java.util.List;
import java.util.UUID;

/**
 * Representation of an injury restriction (SPEC.md section 10.11).
 *
 * @param id          identifier of the restriction
 * @param bodyRegion  body region affected
 * @param description description of the limitation
 * @param isActive    whether the restriction is active
 * @param exerciseIds exercises the user asked to avoid
 */
public record InjuryRestrictionResponse(
        UUID id,
        String bodyRegion,
        String description,
        boolean isActive,
        List<UUID> exerciseIds) {
}
