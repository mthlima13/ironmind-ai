package com.ironmind.auth.password;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PasswordPolicyTest {

    @Test
    @DisplayName("accepts a password with letters, digits and the minimum length")
    void acceptsAValidPassword() {
        assertThat(PasswordPolicy.isStrong("abc12345")).isTrue();
        assertThat(PasswordPolicy.isStrong("Senha1234")).isTrue();
        assertThat(PasswordPolicy.isStrong("a1b2c3d4e5f6g7h8")).isTrue();
    }

    @Test
    @DisplayName("rejects a password shorter than the minimum length")
    void rejectsAShortPassword() {
        assertThat(PasswordPolicy.isStrong("abc1234")).isFalse();
        assertThat(PasswordPolicy.isStrong("a1b2c3d")).isFalse();
    }

    @Test
    @DisplayName("rejects a password without a letter")
    void rejectsAPasswordWithoutLetter() {
        assertThat(PasswordPolicy.isStrong("12345678")).isFalse();
        assertThat(PasswordPolicy.isStrong("0123456789")).isFalse();
    }

    @Test
    @DisplayName("rejects a password without a digit")
    void rejectsAPasswordWithoutDigit() {
        assertThat(PasswordPolicy.isStrong("abcdefgh")).isFalse();
        assertThat(PasswordPolicy.isStrong("abcdefghij")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "abc123",
            "abcdefgh",
            "12345678",
            "!@#$%^&*",
            "abcdefghijklmnop"
    })
    @DisplayName("rejects every password that does not respect the policy")
    void rejectsEveryWeakPassword(String password) {
        assertThat(PasswordPolicy.isStrong(password)).isFalse();
    }

    @Test
    @DisplayName("rejects a password longer than the limit of the encoder")
    void rejectsAPasswordLongerThanTheEncoderLimit() {
        String tooLong = "a1" + "b".repeat(PasswordPolicy.MAX_LENGTH);

        assertThat(PasswordPolicy.isStrong(tooLong)).isFalse();
    }

    @Test
    @DisplayName("accepts a password with the maximum length")
    void acceptsTheMaximumLength() {
        String maximum = "a1" + "b".repeat(PasswordPolicy.MAX_LENGTH - 2);

        assertThat(maximum).hasSize(PasswordPolicy.MAX_LENGTH);
        assertThat(PasswordPolicy.isStrong(maximum)).isTrue();
    }

    @Test
    @DisplayName("leaves the presence of the password to the mandatory validation")
    void ignoresBlankValues() {
        assertThat(PasswordPolicy.isStrong(null)).isTrue();
        assertThat(PasswordPolicy.isStrong("")).isTrue();
        assertThat(PasswordPolicy.isStrong("   ")).isTrue();
    }
}
