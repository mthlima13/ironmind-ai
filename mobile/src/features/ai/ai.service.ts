import { api } from '../../services/api';
import { ENDPOINTS, IDEMPOTENCY_HEADER } from '../../services/endpoints';
import type {
  RecommendationDecisionInput,
  RecommendationDecisionResult,
  WorkoutProposal,
  WorkoutProposalInput,
} from '../../types/ai';
import { createIdempotencyKey } from '../../utils/id';

/**
 * AI calls of the workout proposal (SPEC 11.6 and 12.2).
 *
 * The mobile application never talks to the language model: every call goes
 * through the backend, which validates the answer before returning it.
 */

/** Asks the backend for a workout proposal. */
export async function proposeWorkout(
  input: WorkoutProposalInput,
  idempotencyKey: string = createIdempotencyKey()
): Promise<WorkoutProposal> {
  const response = await api.post<WorkoutProposal>(
    ENDPOINTS.ai.workoutProposals,
    {
      prompt: input.prompt,
      trainingDays: input.trainingDays ?? null,
      goal: input.goal ?? null,
    },
    { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } }
  );
  return response.data;
}

/**
 * Records whether the user accepted, edited or rejected the proposal.
 *
 * Saving the program itself still happens through `POST /programs`, so the
 * backend validates the reviewed structure once more (SPEC 12.2, step 8).
 */
export async function decideRecommendation(
  recommendationId: string,
  input: RecommendationDecisionInput
): Promise<RecommendationDecisionResult> {
  const response = await api.post<RecommendationDecisionResult>(
    ENDPOINTS.ai.recommendationDecision(recommendationId),
    {
      status: input.status,
      programId: input.programId ?? null,
    }
  );
  return response.data;
}
