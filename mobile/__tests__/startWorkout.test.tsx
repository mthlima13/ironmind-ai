/**
 * Free workout flow on the workout screen (SPEC RF-007 and 7.8).
 *
 * A session started without a program has no exercises: the screen must offer
 * the addition of an exercise from the catalogue.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Alert, type AlertButton } from 'react-native';

import StartWorkoutScreen from '../app/(tabs)/comecar';
import { useSessionStore } from '../src/features/workouts/session.store';
import type { Exercise } from '../src/types/exercise';
import type {
  ExerciseSet,
  SessionExercise,
  WorkoutSession,
} from '../src/types/workout';

jest.mock('../src/features/auth/useProfile', () => ({
  useProfile: () => ({ data: null }),
}));

jest.mock('../src/features/programs/usePrograms', () => ({
  usePrograms: () => ({ data: { content: [] }, isLoading: false }),
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

jest.mock('../src/features/exercises/exercise.service', () => ({
  fetchExercises: jest.fn(),
  fetchExercise: jest.fn(),
}));

jest.mock('../src/features/workouts/workout.service', () => ({
  ...jest.requireActual('../src/features/workouts/workout.service'),
  addSessionExercise: jest.fn(),
  completeSession: jest.fn(),
  fetchLastSessionSets: jest.fn(async () => []),
}));

const workoutService = jest.requireMock<
  typeof import('../src/features/workouts/workout.service')
>('../src/features/workouts/workout.service');

const exerciseService = jest.requireMock<
  typeof import('../src/features/exercises/exercise.service')
>('../src/features/exercises/exercise.service');

const exercise: Exercise = {
  id: 'ex-supino-reto',
  name: 'Supino reto com barra',
  description: 'Movimento compound para peitoral, tríceps e deltoide anterior.',
  primaryMuscleGroup: 'Peito',
  secondaryMuscleGroups: ['Tríceps', 'Ombros'],
  equipment: 'Barra',
  instructions: 'Deitado no banco, desça a barra até o peito e empurre.',
  movementType: 'COMPOUND',
  isSystem: true,
};

const sessionExercise: SessionExercise = {
  id: 'sex-1',
  exerciseId: exercise.id,
  exercise,
  position: 1,
  sets: [],
};

function createSession(exercises: SessionExercise[] = []): WorkoutSession {
  return {
    id: 'session-1',
    programId: null,
    programDayId: null,
    startedAt: '2026-02-01T12:00:00.000Z',
    completedAt: null,
    status: 'IN_PROGRESS',
    exercises,
  };
}

let queryClient: QueryClient;

function renderScreen() {
  return render(
    <QueryClientProvider client={queryClient}>
      <StartWorkoutScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  jest
    .mocked(exerciseService.fetchExercises)
    .mockResolvedValue({
      content: [exercise],
      page: 0,
      size: 50,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });

  jest
    .mocked(workoutService.addSessionExercise)
    .mockResolvedValue(sessionExercise);
  jest
    .mocked(workoutService.completeSession)
    .mockResolvedValue(createSession([sessionExercise]));

  useSessionStore.setState({
    session: createSession(),
    pendingCount: 0,
    failedCount: 0,
    isOffline: false,
  });
});

afterEach(() => {
  queryClient.clear();
  jest.restoreAllMocks();
  useSessionStore.setState({
    session: null,
    pendingCount: 0,
    failedCount: 0,
    isOffline: false,
  });
});

describe('StartWorkoutScreen', () => {
  it('offers the addition of an exercise when the session has no exercises', async () => {
    await renderScreen();

    expect(screen.getByTestId('session-exercises-empty')).toBeTruthy();
    expect(screen.getByTestId('add-exercise-button')).toBeTruthy();
  });

  it('adds the exercise selected in the catalogue to the running session', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('add-exercise-button'));

    await waitFor(() => {
      expect(screen.getByTestId('exercise-list')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId(`exercise-item-${exercise.id}`));

    await waitFor(() => {
      expect(workoutService.addSessionExercise).toHaveBeenCalledWith('session-1', {
        exerciseId: exercise.id,
        position: 1,
        notes: null,
      });
    });

    // The exercise is part of the session and is already selected.
    await waitFor(() => {
      expect(screen.getByTestId('session-exercise-sex-1')).toBeTruthy();
    });
    expect(
      useSessionStore.getState().session?.exercises.map((item) => item.id)
    ).toEqual(['sex-1']);
  });

  it('keeps the action to add an exercise at the end of the list', async () => {
    useSessionStore.setState({ session: createSession([sessionExercise]) });

    await renderScreen();

    expect(screen.getByTestId('session-exercise-sex-1')).toBeTruthy();
    expect(screen.getByTestId('add-exercise-button')).toBeTruthy();
  });

  it('shows the failure of the addition with a retry action', async () => {
    jest.mocked(workoutService.addSessionExercise).mockRejectedValue({
      code: 'CONFLICT',
      message: 'Este exercício já está na sessão.',
      fieldErrors: [],
      isNetworkError: false,
    });

    await renderScreen();

    await fireEvent.press(screen.getByTestId('add-exercise-button'));

    await waitFor(() => {
      expect(screen.getByTestId('exercise-list')).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId(`exercise-item-${exercise.id}`));

    await waitFor(() => {
      expect(screen.getByTestId('add-exercise-error')).toBeTruthy();
    });
    expect(screen.getByTestId('error-state-retry')).toBeTruthy();
    expect(
      useSessionStore.getState().session?.exercises
    ).toHaveLength(0);
  });

  it('marks an exercise as done without touching its registered sets', async () => {
    const registeredSet: ExerciseSet = {
      id: 'set-1',
      setNumber: 1,
      weightKg: 80,
      repetitions: 10,
      completedAt: '2026-02-01T12:05:00.000Z',
    };
    const exerciseWithSets: SessionExercise = {
      ...sessionExercise,
      sets: [registeredSet],
    };
    useSessionStore.setState({ session: createSession([exerciseWithSets]) });

    await renderScreen();

    expect(screen.getByText('0 / 1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('toggle-exercise-sex-1'));

    const marked = useSessionStore.getState().session?.exercises[0];
    expect(marked?.completedAt).toEqual(expect.any(String));
    expect(marked?.sets).toEqual([registeredSet]);
    expect(screen.getByText('1 / 1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('toggle-exercise-sex-1'));

    const unmarked = useSessionStore.getState().session?.exercises[0];
    expect(unmarked?.completedAt).toBeNull();
    expect(unmarked?.sets).toEqual([registeredSet]);
    expect(screen.getByText('0 / 1')).toBeTruthy();
  });

  it('asks for confirmation before finishing with pending exercises', async () => {
    const secondExercise: SessionExercise = {
      ...sessionExercise,
      id: 'sex-2',
      exerciseId: 'ex-remada',
      exercise: {
        ...exercise,
        id: 'ex-remada',
        name: 'Remada curvada',
      },
      position: 2,
    };
    const doneExercise: SessionExercise = {
      ...sessionExercise,
      completedAt: '2026-02-01T12:10:00.000Z',
    };
    useSessionStore.setState({
      session: createSession([doneExercise, secondExercise]),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderScreen();

    expect(screen.getByText('1 / 2')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('finish-session-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Finalizar treino?',
      'Você concluiu 1 de 2 exercícios. Finalizar mesmo assim?',
      expect.any(Array)
    );
    expect(workoutService.completeSession).not.toHaveBeenCalled();
  });

  it('finishes after the confirmation and keeps the final progress summary', async () => {
    const secondExercise: SessionExercise = {
      ...sessionExercise,
      id: 'sex-2',
      exerciseId: 'ex-remada',
      exercise: {
        ...exercise,
        id: 'ex-remada',
        name: 'Remada curvada',
      },
      position: 2,
    };
    const doneExercise: SessionExercise = {
      ...sessionExercise,
      completedAt: '2026-02-01T12:10:00.000Z',
    };
    useSessionStore.setState({
      session: createSession([doneExercise, secondExercise]),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderScreen();
    await fireEvent.press(screen.getByTestId('finish-session-button'));

    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[] | undefined;
    await act(async () => {
      buttons?.[1]?.onPress?.();
    });

    await waitFor(() => {
      expect(workoutService.completeSession).toHaveBeenCalledWith('session-1');
    });
    expect(useSessionStore.getState().session).toBeNull();
    expect(screen.getByTestId('finish-summary-progress')).toBeTruthy();
    expect(screen.getByText(/Você concluiu 1 de 2 exercícios/)).toBeTruthy();
  });

  it('finishes without confirmation when every exercise is done', async () => {
    useSessionStore.setState({
      session: createSession([
        {
          ...sessionExercise,
          completedAt: '2026-02-01T12:10:00.000Z',
        },
      ]),
    });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderScreen();
    await fireEvent.press(screen.getByTestId('finish-session-button'));

    expect(alertSpy).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(workoutService.completeSession).toHaveBeenCalledWith('session-1');
    });
  });
});
