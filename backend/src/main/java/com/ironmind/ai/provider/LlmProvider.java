package com.ironmind.ai.provider;

import com.ironmind.ai.schema.VoiceInterpretationPayload;
import com.ironmind.ai.schema.WorkoutProposalPayload;

/**
 * Boundary between the backend and the language model.
 *
 * <p>The interface is shaped by the features instead of the raw transport, so every
 * implementation owns the prompt of its feature and the rest of the backend always handles typed
 * values. The mock implementation answers without any credential, which keeps the tests and the
 * development environment free of cost.
 *
 * <p>Implementations <strong>never</strong> persist anything and never invent an exercise: they
 * only propose values that the backend validates afterwards.
 */
public interface LlmProvider {

    /**
     * Identifier of the model reported to the user, such as {@code mock-ironmind-v1}.
     */
    String modelName();

    /**
     * Proposes a workout program.
     *
     * @param context minimum context of the user
     * @param request request written by the user in natural language
     * @return structured proposal, not validated yet
     */
    WorkoutProposalPayload proposeWorkout(AiContext context, String request);

    /**
     * Answers a coaching message.
     *
     * @param context        minimum context of the user
     * @param historySummary short, non sensitive summary of the recent training history
     * @param message        message written by the user
     * @return answer of the model, always informative and never a diagnosis
     */
    String coach(AiContext context, String historySummary, String message);

    /**
     * Interprets the transcription of a set spoken by the user.
     *
     * @param transcript transcription of the audio
     * @return structured interpretation, not validated yet
     */
    VoiceInterpretationPayload interpretVoice(String transcript);
}
