package com.ironmind.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload of the deletion of the account.
 *
 * <p>The password is demanded as a second proof of ownership: a stolen access token alone must
 * not be enough to erase the account and all of its training history (SPEC.md section 14.3).
 *
 * @param password current password of the account
 */
public record DeleteAccountRequest(
        @NotBlank(message = "A senha é obrigatória.")
        @Size(max = 72, message = "A senha deve ter no máximo 72 caracteres.")
        String password) {
}
