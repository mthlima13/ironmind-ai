package com.ironmind.auth.password;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Constraint that applies the {@link PasswordPolicy} to a password field.
 *
 * <p>It is a dedicated constraint instead of a plain {@code @Pattern} so the same rule is
 * shared by the API, by the mobile application and by the unit tests, without three different
 * implementations drifting apart.
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

    /**
     * Message returned when the password does not respect the policy.
     */
    String message() default PasswordPolicy.VIOLATION_MESSAGE;

    /**
     * Groups of the constraint.
     */
    Class<?>[] groups() default {};

    /**
     * Payload of the constraint.
     */
    Class<? extends Payload>[] payload() default {};
}
