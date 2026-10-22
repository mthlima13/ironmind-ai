package com.ironmind.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload of the password recovery request.
 *
 * @param email e-mail of the account, normalized before the search
 */
public record ForgotPasswordRequest(
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um e-mail válido.")
        String email) {
}
