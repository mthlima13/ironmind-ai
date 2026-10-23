package com.ironmind.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request of the coaching chat (SPEC.md section 11.6).
 *
 * <p>The message is not stored: only the reply of the model is kept in the answer.
 *
 * @param message message written by the user
 */
public record CoachRequest(
        @NotBlank(message = "Escreva a sua mensagem.")
        @Size(max = 1_000, message = "A mensagem deve ter no máximo 1000 caracteres.")
        String message) {
}
