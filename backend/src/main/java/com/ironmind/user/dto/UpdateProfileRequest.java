package com.ironmind.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

/**
 * Payload used to update the profile of the authenticated user.
 *
 * <p>Every field is optional and the update is merged: an omitted field keeps the current value.
 *
 * <p>The fields that identify the user ({@code id}, {@code userId} and {@code user}) and the
 * fields that this endpoint cannot change ({@code email} and {@code role}) are ignored: the owner
 * always comes from the access token, never from the body of the request (SPEC.md section 11.7).
 *
 * @param name        new name of the user
 * @param timezone    new IANA timezone of the user
 * @param preferences new preferences, merged field by field
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdateProfileRequest(
        @Size(min = 2, max = 120, message = "O nome deve ter entre 2 e 120 caracteres.")
        String name,

        @Size(max = 64, message = "O fuso horário deve ter no máximo 64 caracteres.")
        String timezone,

        @Valid
        UpdatePreferencesRequest preferences) {
}
