package com.ironmind.auth.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Development implementation of the {@link RecoveryMailSender} that only logs the token.
 *
 * <p><strong>This implementation must not reach production.</strong> The token of the recovery
 * flow is a credential: logging it exposes the access to the account to anyone with access to
 * the logs. The real e-mail provider must replace this bean before the publication of the
 * application.
 */
@Component
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "logging", matchIfMissing = false)
public class LoggingRecoveryMailSender implements RecoveryMailSender {

    private static final Logger log = LoggerFactory.getLogger(LoggingRecoveryMailSender.class);

    @Override
    public void sendPasswordReset(String email, String token) {
        log.warn("Password reset requested for an account; token delivery is logged in the development "
                + "profile only and must be replaced by a real provider before release.");
    }
}
