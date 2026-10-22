package com.ironmind.auth.dto;

import com.ironmind.auth.password.StrongPassword;
import jakarta.validation.constraints.NotBlank;

/**
 * Payload of the conclusion of the password recovery.
 *
 * @param token       plain value of the single use token
 * @param newPassword new password of the account
 */
public record ResetPasswordRequest(
        @NotBlank(message = "O token de recuperação é obrigatório.")
        String token,

        @NotBlank(message = "A nova senha é obrigatória.")
        @StrongPassword
        String newPassword) {
}
