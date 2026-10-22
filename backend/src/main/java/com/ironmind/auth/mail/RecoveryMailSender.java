package com.ironmind.auth.mail;

/**
 * Delivery of the password recovery message.
 *
 * <p>The interface is the seam between the API and the e-mail provider: the recovery flow
 * never talks to a provider directly, so the provider can be replaced without touching the
 * business rules.
 *
 * <p><strong>Pending:</strong> the real provider must be implemented before the publication of
 * the application. Until then, the development implementation only logs the token.
 */
public interface RecoveryMailSender {

    /**
     * Sends the password reset token to the given address.
     *
     * @param email address of the account, already normalized
     * @param token plain value of the single use token
     */
    void sendPasswordReset(String email, String token);
}
