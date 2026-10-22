package com.ironmind.auth.dto;

import com.ironmind.auth.password.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Locale;

/**
 * Payload of the account creation.
 *
 * @param name     name of the user
 * @param email    e-mail of the user, normalized before being stored
 * @param password password of the user, stored only as an Argon2id hash
 * @param timezone IANA timezone of the user, optional
 */
public record RegisterRequest(
        @NotBlank(message = "O nome é obrigatório.")
        @Size(min = 2, max = 120, message = "O nome deve ter entre 2 e 120 caracteres.")
        String name,

        @NotBlank(message = "O e-mail é obrigatório.")
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 255, message = "O e-mail deve ter no máximo 255 caracteres.")
        String email,

        @NotBlank(message = "A senha é obrigatória.")
        @StrongPassword
        String password,

        @Size(max = 64, message = "O fuso horário deve ter no máximo 64 caracteres.")
        String timezone) {

    /**
     * Canonical representation of the payload, used to detect an idempotency key replayed with a
     * different body.
     *
     * <p>The password is deliberately left out of the fingerprint: a raw secret cannot be stored
     * and the Argon2id hash is salted, so the same password would produce a different
     * fingerprint on every call. The account is already identified by the normalized e-mail.
     */
    public String canonicalPayload() {
        return String.join("|",
                name == null ? "" : name.trim(),
                email == null ? "" : email.trim().toLowerCase(Locale.ROOT),
                timezone == null ? "" : timezone.trim());
    }
}
