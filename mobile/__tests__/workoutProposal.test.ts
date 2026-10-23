import {
  cloneDays,
  isProposalEdited,
  PROPOSAL_LIMITS,
  toProgramDraft,
  updateExercise,
} from '../src/features/ai/proposal';
import { decideRecommendation, proposeWorkout } from '../src/features/ai/ai.service';
import { createProgram } from '../src/features/programs/program.service';
import { api, mapApiError } from '../src/services/api';
import {
  MOCK_DEMO_EMAIL,
  MOCK_DEMO_PASSWORD,
} from '../src/services/mockAdapter';
import { saveAccessToken } from '../src/storage/secureToken';
import type { WorkoutProposal } from '../src/types/ai';
import type { AuthResponse, Page } from '../src/types/api';
import type { WorkoutProgram } from '../src/types/program';

const PROPOSAL: WorkoutProposal = {
  recommendationId: 'rec-1',
  status: 'PENDING',
  model: 'mock-ironmind-v1',
  name: 'Treino de hipertrofia',
  goal: 'HYPERTROPHY',
  days: [
    {
      name: 'Dia 1',
      exercises: [
        {
          exerciseId: 'ex-supino-reto',
          name: 'Supino reto com barra',
          primaryMuscleGroup: 'Peito',
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
        },
        {
          exerciseId: 'ex-remada-curva',
          name: 'Remada curvada',
          primaryMuscleGroup: 'Costas',
          sets: 4,
          repsMin: 6,
          repsMax: 10,
          restSeconds: 120,
        },
      ],
    },
  ],
  explanation: '  Proposta gerada a partir do seu pedido.  ',
  warnings: [],
  disclaimer: 'Sugestão informativa gerada por IA.',
};

describe('workout proposal review helpers', () => {
  it('converts the reviewed proposal into the payload of the program endpoint', () => {
    const draft = toProgramDraft(
      PROPOSAL,
      '  Meu programa  ',
      cloneDays(PROPOSAL.days)
    );

    expect(draft.name).toBe('Meu programa');
    expect(draft.description).toBe('Proposta gerada a partir do seu pedido.');
    expect(draft.goal).toBe('HYPERTROPHY');
    expect(draft.splitType).toBe('CUSTOM');
    expect(draft.days).toHaveLength(1);
    expect(draft.days[0].name).toBe('Dia 1');
    expect(draft.days[0].exercises[0]).toEqual({
      exerciseId: 'ex-supino-reto',
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: 90,
    });
  });

  it('clamps the values to the limits accepted by the backend', () => {
    const days = updateExercise(cloneDays(PROPOSAL.days), 0, 0, {
      sets: 999,
      restSeconds: 999,
    });

    expect(days[0]?.exercises[0]?.sets).toBe(PROPOSAL_LIMITS.maxSets);
    expect(days[0]?.exercises[0]?.restSeconds).toBe(
      PROPOSAL_LIMITS.maxRestSeconds
    );
  });

  it('keeps the repetition range valid when one end passes the other', () => {
    const upwards = updateExercise(cloneDays(PROPOSAL.days), 0, 0, {
      repsMin: 30,
    });
    expect(upwards[0]?.exercises[0]?.repsMin).toBe(30);
    expect(upwards[0]?.exercises[0]?.repsMax).toBe(30);

    const downwards = updateExercise(cloneDays(PROPOSAL.days), 0, 0, {
      repsMax: 2,
    });
    expect(downwards[0]?.exercises[0]?.repsMin).toBe(2);
    expect(downwards[0]?.exercises[0]?.repsMax).toBe(2);
  });

  it('does not mutate the answer of the AI while the user edits', () => {
    const days = updateExercise(cloneDays(PROPOSAL.days), 0, 0, { sets: 5 });

    expect(PROPOSAL.days[0]?.exercises[0]?.sets).toBe(3);
    expect(days[0]?.exercises[0]?.sets).toBe(5);
  });

  it('detects whether the suggestion was accepted or edited', () => {
    expect(isProposalEdited(PROPOSAL, PROPOSAL.name, cloneDays(PROPOSAL.days))).toBe(
      false
    );
    expect(isProposalEdited(PROPOSAL, 'Outro nome', cloneDays(PROPOSAL.days))).toBe(
      true
    );

    const edited = updateExercise(cloneDays(PROPOSAL.days), 0, 0, { sets: 4 });
    expect(isProposalEdited(PROPOSAL, PROPOSAL.name, edited)).toBe(true);
  });

  it('truncates the description to the limit of the program endpoint', () => {
    const longProposal: WorkoutProposal = {
      ...PROPOSAL,
      explanation: 'a'.repeat(PROPOSAL_LIMITS.maxDescriptionLength + 500),
    };

    const draft = toProgramDraft(longProposal, 'Programa', cloneDays(PROPOSAL.days));

    expect(draft.description).toHaveLength(PROPOSAL_LIMITS.maxDescriptionLength);
  });
});

describe('mock AI proposal flow', () => {
  beforeAll(async () => {
    const login = await api.post<AuthResponse>('/auth/login', {
      email: MOCK_DEMO_EMAIL,
      password: MOCK_DEMO_PASSWORD,
    });
    await saveAccessToken(login.data.accessToken);
  });

  it('generates a proposal, saves it as a program and records the review', async () => {
    const proposal = await proposeWorkout({
      prompt: 'Treino de hipertrofia para 4 dias',
    });

    expect(proposal.status).toBe('PENDING');
    expect(proposal.days.length).toBeGreaterThan(0);
    expect(proposal.days[0]?.exercises.length).toBeGreaterThan(0);
    expect(proposal.disclaimer).toEqual(expect.any(String));

    const program = await createProgram(
      toProgramDraft(proposal, 'Programa da IA', cloneDays(proposal.days))
    );

    expect(program.id).toEqual(expect.any(String));
    expect(program.name).toBe('Programa da IA');
    expect(program.splitType).toBe('CUSTOM');
    expect(program.days[0]?.exercises[0]?.exerciseId).toBe(
      proposal.days[0]?.exercises[0]?.exerciseId
    );

    const decision = await decideRecommendation(proposal.recommendationId, {
      status: 'EDITED',
      programId: program.id,
    });
    expect(decision.status).toBe('EDITED');
    expect(decision.savedProgramId).toBe(program.id);

    const page = await api.get<Page<WorkoutProgram>>('/programs', {
      params: { page: 0, size: 100 },
    });
    expect(page.data.content.some((item) => item.id === program.id)).toBe(true);
  });

  it('records the rejection without creating a program', async () => {
    const proposal = await proposeWorkout({
      prompt: 'Treino de força para 3 dias',
    });

    const decision = await decideRecommendation(proposal.recommendationId, {
      status: 'REJECTED',
    });

    expect(decision.status).toBe('REJECTED');
    expect(decision.acceptedAt).toBeNull();
    expect(decision.savedProgramId).toBeNull();
  });

  it('refuses a second decision for the same recommendation', async () => {
    const proposal = await proposeWorkout({
      prompt: 'Treino de resistência para 2 dias',
    });
    await decideRecommendation(proposal.recommendationId, {
      status: 'REJECTED',
    });

    let status: number | undefined;
    try {
      await decideRecommendation(proposal.recommendationId, {
        status: 'ACCEPTED',
      });
    } catch (error) {
      status = mapApiError(error).status;
    }

    expect(status).toBe(409);
  });
});
