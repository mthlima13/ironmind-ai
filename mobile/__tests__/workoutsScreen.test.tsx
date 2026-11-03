import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import WorkoutsScreen from '../app/(tabs)/treinos';
import { MOCK_PROGRAMS } from '../src/mocks/programs';
import {
  PROGRAM_TEMPLATES,
  filterProgramTemplates,
} from '../src/features/programs/trainingTemplates';
import { ROUTES } from '../src/navigation/linking';

const mockPush = router.push as jest.Mock;

const mockUsePrograms = jest.fn();
const mockRefetch = jest.fn();

jest.mock('../src/features/programs/usePrograms', () => ({
  usePrograms: () => mockUsePrograms(),
  useCreateProgram: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

/** Catalogue loaded inside the "Catálogo" tab (ExerciseList uses this hook). */
jest.mock('../src/features/exercises/useExercises', () => ({
  useExercises: () => ({
    data: {
      content: [
        {
          id: 'ex-supino',
          name: 'Supino reto com barra',
          primaryMuscleGroup: 'CHEST',
          equipment: 'Barra',
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useExerciseCatalogue: () => ({
    data: {
      content: [
        {
          id: 'ex-supino',
          name: 'Supino reto com barra',
          primaryMuscleGroup: 'CHEST',
          equipment: 'Barra',
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateExercise: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

function loadedPrograms(content = MOCK_PROGRAMS) {
  return {
    data: { content },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  };
}

describe('Treinos listing', () => {
  beforeEach(() => {
    mockRefetch.mockReset();
    mockUsePrograms.mockReturnValue(loadedPrograms());
    mockPush.mockClear();
  });

  it('starts on "Meus programas" and opens the details of a saved program', async () => {
    const program = MOCK_PROGRAMS[0]!;
    await render(<WorkoutsScreen />);

    expect(screen.getByTestId('training-tab-mine')).toBeTruthy();
    expect(screen.getByTestId(`program-card-${program.id}`)).toBeTruthy();
    // The catalogue templates stay out of the user's own list.
    expect(screen.queryByTestId(`template-card-${PROGRAM_TEMPLATES[0]!.id}`)).toBeNull();

    await fireEvent.press(screen.getByTestId(`program-card-${program.id}`));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: ROUTES.programa,
      params: { id: program.id, source: 'saved' },
    });
  });

  it('keeps the exercise catalogue collapsed until "Criar treino" is pressed', async () => {
    await render(<WorkoutsScreen />);

    // The catalogue is not a header action anymore (treinos.html): the search,
    // the muscle group chips and the list live inside the tab.
    expect(screen.queryByTestId('open-exercise-catalogue')).toBeNull();

    await fireEvent.press(screen.getByTestId('training-tab-explore'));

    // Minimised by default: only the create action shows up.
    expect(screen.queryByTestId('exercise-search')).toBeNull();
    expect(screen.queryByTestId('exercise-list')).toBeNull();

    await fireEvent.press(screen.getByTestId('toggle-exercise-picker'));

    expect(screen.getByTestId('exercise-search')).toBeTruthy();
    expect(screen.getByTestId('exercise-filter-ALL')).toBeTruthy();
    expect(screen.getByTestId('exercise-item-ex-supino')).toBeTruthy();

    // Pressing again collapses the picker.
    await fireEvent.press(screen.getByTestId('toggle-exercise-picker'));
    expect(screen.queryByTestId('exercise-list')).toBeNull();
  });

  it('keeps the custom exercise creation inside the exercise picker', async () => {
    await render(<WorkoutsScreen />);

    await fireEvent.press(screen.getByTestId('training-tab-explore'));
    await fireEvent.press(screen.getByTestId('toggle-exercise-picker'));

    await fireEvent.press(screen.getByTestId('toggle-custom-exercise'));

    expect(screen.getByText('Novo exercício')).toBeTruthy();
  });

  it('shows every template on "Catálogo" and filters them by level', async () => {
    await render(<WorkoutsScreen />);

    await fireEvent.press(screen.getByTestId('training-tab-explore'));

    expect(
      screen.getByText(`${PROGRAM_TEMPLATES.length} programas`)
    ).toBeTruthy();
    PROGRAM_TEMPLATES.forEach((template) => {
      expect(screen.getByTestId(`template-card-${template.id}`)).toBeTruthy();
    });

    const beginners = filterProgramTemplates('BEGINNER');
    const advanced = filterProgramTemplates('ADVANCED');

    await fireEvent.press(screen.getByTestId('level-filter-BEGINNER'));

    expect(
      screen.getByText(`${beginners.length} programas • Iniciante`)
    ).toBeTruthy();
    beginners.forEach((template) => {
      expect(screen.getByTestId(`template-card-${template.id}`)).toBeTruthy();
    });
    advanced.forEach((template) => {
      expect(screen.queryByTestId(`template-card-${template.id}`)).toBeNull();
    });
  });

  it('opens the details of a template as a read-only model', async () => {
    const template = PROGRAM_TEMPLATES[0]!;
    await render(<WorkoutsScreen />);

    await fireEvent.press(screen.getByTestId('training-tab-explore'));
    await fireEvent.press(screen.getByTestId(`template-card-${template.id}`));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: ROUTES.programa,
      params: { id: template.id, source: 'template' },
    });
  });

  it('sends an empty list to "Catálogo"', async () => {
    mockUsePrograms.mockReturnValue(loadedPrograms([]));
    await render(<WorkoutsScreen />);

    expect(screen.getByTestId('workouts-empty')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('workouts-empty-action'));

    await waitFor(() =>
      expect(screen.getByTestId('template-count')).toBeTruthy()
    );
  });

  it('shows the loading state while the programs are fetched', async () => {
    mockUsePrograms.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });
    await render(<WorkoutsScreen />);

    expect(screen.getByTestId('workouts-loading')).toBeTruthy();
  });

  it('shows the error state and retries the list', async () => {
    mockUsePrograms.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sem conexão com o servidor.',
        fieldErrors: [],
        isNetworkError: true,
      },
      refetch: mockRefetch,
    });
    await render(<WorkoutsScreen />);

    expect(screen.getByText('Sem conexão com o servidor.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
