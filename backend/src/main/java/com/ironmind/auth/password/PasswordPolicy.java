package com.ironmind.auth.password;

import java.util.regex.Pattern;

/**
 * Password policy of the product.
 *
 * <p>The API is the owner of the contract: the mobile application runs the same rule to give
 * fast feedback, but the backend is the one that guarantees it (SPEC.md section 14.1). The rule
 * is the one implemented by {@code mobile/src/features/auth/auth.validation.ts}: at least
 * {@value #MIN_LENGTH} characters, at least one letter and at least one digit.
 *
 * <p>The maximum length of {@value #MAX_LENGTH} characters is the limit of the Argon2id and
 * BCrypt encoders: a longer secret is truncated by the algorithm, which would silently accept
 * two different passwords as the same one.
 */
public final class PasswordPolicy {

    /**
     * Minimum number of characters accepted by the policy.
     */
    public static final int MIN_LENGTH = 8;

    /**
     * Maximum number of characters accepted by the policy.
     */
    public static final int MAX_LENGTH = 72;

    /**
     * Message returned when the password does not respect the policy.
     */
    public static final String VIOLATION_MESSAGE =
            "A senha precisa ter entre 8 e 72 caracteres, com ao menos uma letra e um número.";

    private static final Pattern LETTER = Pattern.compile("[a-zA-Z]");

    private static final Pattern DIGIT = Pattern.compile("\\d");

    private PasswordPolicy() {
    }

    /**
     * Tells whether the password respects the policy.
     *
     * <p>A {@code null} or blank value is not a policy violation: the presence of the field is
     * validated separately by {@code @NotBlank}.
     */
    public static boolean isStrong(String password) {
        if (password == null || password.isBlank()) {
            return true;
        }
        if (password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
            return false;
        }
        return LETTER.matcher(password).find() && DIGIT.matcher(password).find();
    }
}
