package com.ironmind.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Payload of the renewal of the session.
 *
 * @param refreshToken plain value of the refresh token
 */
public record RefreshRequest(
        @NotBlank(message = "O token de renovação é obrigatório.")
        String refreshToken) {
}
