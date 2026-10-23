package com.ironmind.ai.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CoachSafetyGuardTest {

    private final CoachSafetyGuard guard = new CoachSafetyGuard();

    @Test
    @DisplayName("returns the answer with the general disclaimer")
    void returnsTheAnswerWithTheGeneralDisclaimer() {
        CoachSafetyGuard.Result result = guard.review("Como melhorar no supino?", "Progrida 2,5 kg.");

        assertThat(result.reply()).isEqualTo("Progrida 2,5 kg.");
        assertThat(result.disclaimers()).containsExactly(CoachSafetyGuard.GENERAL_DISCLAIMER);
    }

    @Test
    @DisplayName("adds the pain guidance when the message reports pain")
    void addsThePainGuidanceWhenTheMessageReportsPain() {
        CoachSafetyGuard.Result result = guard.review("Sinto dor no ombro ao supinar.", "Reduza o volume.");

        assertThat(result.disclaimers()).contains(CoachSafetyGuard.PAIN_DISCLAIMER);
        assertThat(result.reply()).contains("interrompa");
    }

    @Test
    @DisplayName("does not repeat the guidance when the answer already tells the user to stop")
    void doesNotRepeatTheGuidance() {
        CoachSafetyGuard.Result result = guard.review("Dor no joelho.",
                "Interrompa o agachamento e procure um profissional.");

        assertThat(result.reply()).isEqualTo("Interrompa o agachamento e procure um profissional.");
        assertThat(result.disclaimers()).contains(CoachSafetyGuard.PAIN_DISCLAIMER);
    }

    @Test
    @DisplayName("replaces a diagnosis or a prescription with a safe answer")
    void replacesADiagnosisOrAPrescription() {
        CoachSafetyGuard.Result result = guard.review("O que eu tenho?",
                "Você tem uma lesão no manguito e o diagnóstico pede um anti-inflamatório.");

        assertThat(result.reply()).doesNotContain("diagnóstico");
        assertThat(result.reply()).contains("Não posso responder a isso com segurança");
    }

    @Test
    @DisplayName("does not treat the word dorsal as a report of pain")
    void doesNotTreatTheWordDorsalAsPain() {
        CoachSafetyGuard.Result result = guard.review("Como treinar dorsal?", "Faça puxadas.");

        assertThat(result.disclaimers()).doesNotContain(CoachSafetyGuard.PAIN_DISCLAIMER);
        assertThat(result.reply()).isEqualTo("Faça puxadas.");
    }

    @Test
    @DisplayName("uses a safe answer when the provider returns nothing")
    void usesASafeAnswerWhenTheProviderReturnsNothing() {
        CoachSafetyGuard.Result result = guard.review("Oi", "   ");

        assertThat(result.reply()).contains("Não posso responder a isso com segurança");
        assertThat(result.disclaimers()).contains(CoachSafetyGuard.GENERAL_DISCLAIMER);
    }
}
