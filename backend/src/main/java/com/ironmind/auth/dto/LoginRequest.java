package com.ironmind.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload of the login.
 *
 * <p>The password is only checked for the presence and for the maximum length: the policy of
 * the password is applied on the creation of the account and on its recovery, never on the
 * login, where the answer must not tell anything about the stored credential.
 *
 * @param email    e-mail of the user, normalized before the search
 * @param password password informed by the user
 */
public record LoginRequest(
        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @NotBlank(message = "A senha é obrigatória.")
        @Size(max = 72, message = "A senha deve ter no máximo 72 caracteres.")
        String password) {
}
