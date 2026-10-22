package com.ironmind.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload of the logout.
 *
 * @param refreshToken plain value of the refresh token to be revoked
 */
public record LogoutRequest(
        @NotBlank(message = "O token de renovação é obrigatório.")
        String refreshToken) {
}
