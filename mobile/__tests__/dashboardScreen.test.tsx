/**
 * Dashboard tab (inicio.html design, SPEC 15.1).
 *
 * The dashboard owns the weekly progress and the workout of the day; the
 * volume chart belongs exclusively to the Evolução tab.
 */
import {
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { router } from 'expo-router';

import DashboardScreen from '../app/(tabs)/index';
import { useSessionStore } from '../src/features/workouts/session.store';
import { ROUTES } from '../src/navigation/linking';
import type { DashboardOverview } from '../src/types/analytics';
import type { Exercise } from '../src/types/exercise';
import type { WorkoutSession } from '../src/types/workout';

const mockPush = router.push as jest.Mock;

const mockUseDashboard = jest.fn();
const mockUsePrograms = jest.fn();

jest.mock('../src/features/analytics/useDashboard', () => ({
  useDashboardOverview: () => mockUseDashboard(),
}));

jest.mock('../src/features/auth/useAuth', () => ({
  useAuthState: () => ({
    status: 'authenticated',
    user: { id: 'u1', name: 'Thiago Silva' },
    preferences: {
      preferredUnits: 'KG',
      trainingExperience: 'INTERMEDIATE',
      goal: 'HYPERTROPHY',
      availableEquipment: [],
      trainingDays: 3,
      privacySettings: {
        publicProfile: false,
        showRecords: true,
        allowSharing: false,
      },
    },
  }),
}));

jest.mock('../src/features/programs/usePrograms', () => ({
  usePrograms: () => mockUsePrograms(),
}));

jest.mock('../src/features/workouts/useOfflineSync', () => ({
  useOfflineSync: () => ({
    enqueue: jest.fn(),
    refresh: jest.fn(),
    syncNow: jest.fn(),
    setOffline: jest.fn(),
    pendingCount: 0,
    failedCount: 0,
    isOffline: false,
  }),
}));

/** ISO date (yyyy-MM-dd) of a local date. */
function isoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildOverview(overrides: Partial<DashboardOverview> = {}): DashboardOverview {
  return {
    summary: {
      totalVolumeKg: 1200,
      completedSessions: 2,
      recordsBroken: 0,
      totalSets: 18,
      averageSessionMinutes: 52,
    },
    volumeChangePercent: 4.2,
    activity: [],
    recentSessions: [],
    ...overrides,
  };
}

const program = {
  id: 'prog-1',
  name: 'Base ABCD',
  description: 'Programa base de quatro dias',
  goal: 'HYPERTROPHY' as const,
  splitType: 'ABCD' as const,
  isArchived: false,
  createdAt: '2026-01-01',
  days: [
    'Peito e tríceps',
    'Costas e bíceps',
    'Pernas e glúteos',
    'Ombros e braços',
  ].map((name, index) => ({
    id: `day-${index + 1}`,
    programId: 'prog-1',
    name,
    position: index + 1,
    exercises: [],
  })),
};

const exercise: Exercise = {
  id: 'ex-supino-reto',
  name: 'Supino reto com barra',
  description: 'Movimento composto para o peitoral.',
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Tríceps'],
  equipment: 'Barra',
  instructions: 'Desça a barra até o peito e empurre.',
  movementType: 'COMPOUND',
  isSystem: true,
};

function buildSession(programDayId: string | null): WorkoutSession {
  return {
    id: 'session-1',
    programId: programDayId ? 'prog-1' : null,
    programDayId,
    startedAt: '2026-02-01T12:00:00.000Z',
    completedAt: null,
    status: 'IN_PROGRESS',
    exercises: [
      {
        id: 'sex-1',
        exerciseId: exercise.id,
        exercise,
        position: 1,
        sets: [],
      },
    ],
  };
}

describe('Dashboard (Início)', () => {
  beforeEach(() => {
    mockUseDashboard.mockReset();
    mockUsePrograms.mockReset();
    mockPush.mockClear();
    useSessionStore.setState({ session: null, isOffline: false });
    mockUsePrograms.mockReturnValue({
      data: { content: [program] },
      isLoading: false,
    });
  });

  it('shows the weekly progress towards the profile goal', async () => {
    // Two sessions already done of a goal of three: the message must ask the
    // one remaining session, based only on the backend data.
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    mockUseDashboard.mockReturnValue({
      data: buildOverview({
        activity: [
          { date: isoDate(today), volumeKg: 700, completedSessions: 1 },
          { date: isoDate(yesterday), volumeKg: 500, completedSessions: 1 },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const screen = await render(<DashboardScreen />);

    expect(screen.getByTestId('dashboard-week-progress')).toBeTruthy();
    expect(screen.getByTestId('dashboard-week-counter')).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByText('Falta apenas 1 treino para sua meta semanal.')
      ).toBeTruthy();
    });
  });

  it('has no volume chart: the chart belongs to the Evolução tab', async () => {
    mockUseDashboard.mockReturnValue({
      data: buildOverview(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const screen = await render(<DashboardScreen />);

    expect(screen.queryByTestId('dashboard-activity-chart')).toBeNull();
    expect(screen.getByText('Dica do dia')).toBeTruthy();
  });

  it('offers the quick shortcuts to exercises, workouts and history', async () => {
    mockUseDashboard.mockReturnValue({
      data: buildOverview(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const screen = await render(<DashboardScreen />);

    fireEvent.press(screen.getByTestId('dashboard-quick-history'));

    expect(mockPush).toHaveBeenCalledWith(ROUTES.evolucao);
  });

  it('binds the running session to its program day', async () => {
    mockUseDashboard.mockReturnValue({
      data: buildOverview(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    useSessionStore.setState({ session: buildSession('day-2') });

    const screen = await render(<DashboardScreen />);

    expect(screen.getByTestId('dashboard-start-workout')).toBeTruthy();
    expect(screen.getByText('Costas e bíceps')).toBeTruthy();
    expect(screen.getByText('Dia 2 de 4')).toBeTruthy();
  });

  it('falls back to the program when no session is running', async () => {
    mockUseDashboard.mockReturnValue({
      data: buildOverview(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const screen = await render(<DashboardScreen />);

    expect(screen.getByTestId('dashboard-start-workout')).toBeTruthy();
    expect(screen.getByText('Base ABCD')).toBeTruthy();
  });

  it('points to the Treinos tab when there is no active program', async () => {
    mockUseDashboard.mockReturnValue({
      data: buildOverview(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUsePrograms.mockReturnValue({ data: { content: [] }, isLoading: false });

    const screen = await render(<DashboardScreen />);

    expect(screen.getByTestId('dashboard-program')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-start-workout')).toBeNull();
  });
});
