import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  ProposedDay,
  RecommendationDecision,
  WorkoutProposal,
  WorkoutProposalInput,
} from '../../types/ai';
import type { WorkoutProgram } from '../../types/program';
import { createProgram } from '../programs/program.service';
import { programQueryKeys } from '../programs/usePrograms';
import { decideRecommendation, proposeWorkout } from './ai.service';
import { isProposalEdited, toProgramDraft } from './proposal';

/** Generates a workout proposal from the prompt of the user. */
export function useGenerateWorkoutProposal() {
  return useMutation({
    mutationFn: (input: WorkoutProposalInput) => proposeWorkout(input),
  });
}

export type SaveProposalVariables = {
  proposal: WorkoutProposal;
  /** Name reviewed by the user for the new program. */
  name: string;
  /** Days reviewed (and possibly edited) by the user. */
  days: ProposedDay[];
};

export type SaveProposalResult = {
  program: WorkoutProgram;
  decision: Extract<RecommendationDecision, 'ACCEPTED' | 'EDITED'>;
  /** `true` when the program was saved but the review could not be recorded. */
  decisionFailed: boolean;
};

/**
 * Saves the reviewed proposal as a program (SPEC 12.2, step 8).
 *
 * The program is created first, through the regular program endpoint, so the
 * backend validates the structure again. The review decision is recorded
 * afterwards, linked to the saved program.
 */
export function useSaveWorkoutProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      proposal,
      name,
      days,
    }: SaveProposalVariables): Promise<SaveProposalResult> => {
      const decision = isProposalEdited(proposal, name, days)
        ? 'EDITED'
        : 'ACCEPTED';
      const program = await createProgram(toProgramDraft(proposal, name, days));

      let decisionFailed = false;
      try {
        await decideRecommendation(proposal.recommendationId, {
          status: decision,
          programId: program.id,
        });
      } catch {
        // The program is already saved; only the review metric was lost.
        decisionFailed = true;
      }

      return { program, decision, decisionFailed };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programQueryKeys.all });
    },
  });
}

/** Records that the user discarded the proposal. */
export function useRejectWorkoutProposal() {
  return useMutation({
    mutationFn: (proposal: WorkoutProposal) =>
      decideRecommendation(proposal.recommendationId, { status: 'REJECTED' }),
  });
}
