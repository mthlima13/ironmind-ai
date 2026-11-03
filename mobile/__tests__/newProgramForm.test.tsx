import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { NewProgramForm } from '../src/features/programs/NewProgramForm';
import { buildSplitExercises } from '../src/features/programs/splitBlueprints';
import { MOCK_EXERCISES } from '../src/mocks/exercises';

const mockMutateAsync = jest.fn();
let mockCatalogueData: { content: typeof MOCK_EXERCISES } | undefined;

jest.mock('../src/features/programs/usePrograms', () => ({
  useCreateProgram: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

jest.mock('../src/features/exercises/useExercises', () => ({
  useExerciseCatalogue: () => ({
    data: mockCatalogueData,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

describe('NewProgramForm', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({});
    mockCatalogueData = { content: MOCK_EXERCISES };
  });

  it('offers every split and names the days of the chosen one', async () => {
    await render(<NewProgramForm onCreated={jest.fn()} onCancel={jest.fn()} />);

    [
      'AB',
      'ABC',
      'ABCD',
      'ABCDE',
      'FULL_BODY',
      'UPPER_LOWER',
      'PPL',
      'ARNOLD_SPLIT',
      'PHUL',
      'HYBRID_PPL_UPPER_LOWER',
      'CUSTOM',
    ].forEach((split) => {
      expect(screen.getByTestId(`program-split-${split}`)).toBeTruthy();
    });

    // AB is the default split: two days, already named.
    expect(screen.getByText(/2 dias: Superior/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('program-split-ABCD'));

    expect(screen.getByText(/4 dias: Peito e tríceps/)).toBeTruthy();
    expect(screen.getByText(/Ombros e braços/)).toBeTruthy();
  });

  it('only offers the day counts the split accepts', async () => {
    await render(<NewProgramForm onCreated={jest.fn()} onCancel={jest.fn()} />);

    // AB accepts a single count, so there is nothing to choose.
    expect(screen.queryByTestId('program-days-2')).toBeNull();

    await fireEvent.press(screen.getByTestId('program-split-PPL'));
    expect(screen.getByTestId('program-days-3')).toBeTruthy();
    expect(screen.getByTestId('program-days-6')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('program-days-6'));
    await fireEvent.press(screen.getByTestId('program-split-AB'));

    // The six days of PPL do not fit AB: the form falls back to two.
    expect(screen.queryByTestId('program-days-6')).toBeNull();
    expect(screen.getByText(/2 dias: Superior/)).toBeTruthy();
  });

  it('creates the program with the exercises of the chosen split', async () => {
    const onCreated = jest.fn();
    await render(<NewProgramForm onCreated={onCreated} onCancel={jest.fn()} />);

    await fireEvent.changeText(
      screen.getByTestId('new-program-name'),
      '  Meu ABCD  '
    );
    await fireEvent.press(screen.getByTestId('program-split-ABCD'));
    await fireEvent.press(screen.getByTestId('create-program-submit'));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

    const [{ input }] = mockMutateAsync.mock.calls[0] as [
      {
        input: {
          name: string;
          splitType: string;
          days: {
            name: string;
            exercises: { exerciseId: string; targetSets: number }[];
          }[];
        };
      },
    ];
    expect(input.name).toBe('Meu ABCD');
    expect(input.splitType).toBe('ABCD');
    expect(input.days.map((day) => day.name)).toEqual([
      'Peito e tríceps',
      'Costas e bíceps',
      'Pernas e glúteos',
      'Ombros e braços',
    ]);

    // Every day comes with exercises, and every id belongs to the catalogue.
    const catalogueIds = new Set(MOCK_EXERCISES.map((exercise) => exercise.id));
    input.days.forEach((day) => {
      expect(day.exercises.length).toBeGreaterThanOrEqual(6);
      day.exercises.forEach((exercise) => {
        expect(catalogueIds.has(exercise.exerciseId)).toBe(true);
        expect(exercise.targetSets).toBeGreaterThan(0);
      });
    });

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });

  it('fills a full body program with one session of the whole body', async () => {
    await render(<NewProgramForm onCreated={jest.fn()} onCancel={jest.fn()} />);

    await fireEvent.changeText(
      screen.getByTestId('new-program-name'),
      'Full Body'
    );
    await fireEvent.press(screen.getByTestId('program-split-FULL_BODY'));
    await fireEvent.press(screen.getByTestId('program-days-1'));
    await fireEvent.press(screen.getByTestId('create-program-submit'));

    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

    const [{ input }] = mockMutateAsync.mock.calls[0] as [
      { input: { days: { name: string; exercises: unknown[] }[] } },
    ];
    expect(input.days).toHaveLength(1);
    expect(input.days[0]!.name).toBe('Corpo inteiro');
    expect(input.days[0]!.exercises).toHaveLength(8);
  });

  it('lets the user choose the exercises of each custom day', async () => {
    const customDays = buildSplitExercises('CUSTOM', 2, MOCK_EXERCISES).days;
    const removedId = customDays[1]![0]!.exerciseId;
    const peckDeck = MOCK_EXERCISES.find(
      (exercise) => exercise.name === 'Peck deck'
    )!;

    await render(<NewProgramForm onCreated={jest.fn()} onCancel={jest.fn()} />);

    // The section only exists for the custom split.
    expect(screen.queryByTestId('custom-day-exercises')).toBeNull();

    await fireEvent.changeText(
      screen.getByTestId('new-program-name'),
      'Meu personalizado'
    );
    await fireEvent.press(screen.getByTestId('program-split-CUSTOM'));

    expect(screen.getByTestId('custom-day-exercises')).toBeTruthy();
    expect(screen.getByText('Dia 1')).toBeTruthy();
    expect(screen.getByText('Dia 2')).toBeTruthy();

    // Adds an exercise that is not part of the default full body session.
    await fireEvent.press(screen.getByTestId('toggle-custom-day-0'));
    await fireEvent.changeText(
      screen.getByTestId('custom-exercise-search'),
      'Peck deck'
    );
    await fireEvent.press(
      screen.getByTestId(`custom-exercise-option-${peckDeck.id}`)
    );

    // Removes the first exercise of the second day.
    await fireEvent.press(
      screen.getByTestId(`remove-custom-exercise-1-${removedId}`)
    );

    await fireEvent.press(screen.getByTestId('create-program-submit'));
    await waitFor(() => expect(mockMutateAsync).toHaveBeenCalledTimes(1));

    const [{ input }] = mockMutateAsync.mock.calls[0] as [
      {
        input: {
          days: { name: string; exercises: { exerciseId: string }[] }[];
        };
      },
    ];

    expect(input.days.map((day) => day.name)).toEqual(['Dia 1', 'Dia 2']);
    expect(
      input.days[0]!.exercises.some(
        (exercise) => exercise.exerciseId === peckDeck.id
      )
    ).toBe(true);
    expect(
      input.days[1]!.exercises.some(
        (exercise) => exercise.exerciseId === removedId
      )
    ).toBe(false);
  });

  it('does not create a program before the catalogue loads', async () => {
    mockCatalogueData = undefined;

    await render(<NewProgramForm onCreated={jest.fn()} onCancel={jest.fn()} />);

    await fireEvent.changeText(
      screen.getByTestId('new-program-name'),
      'Sem catálogo'
    );
    await fireEvent.press(screen.getByTestId('create-program-submit'));

    expect(screen.getByTestId('new-program-error')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('refuses to create a program without a name', async () => {
    await render(<NewProgramForm onCreated={jest.fn()} onCancel={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('create-program-submit'));

    expect(screen.getByText('Informe o nome do programa.')).toBeTruthy();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('shows the message of the API when the creation fails', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      code: 'VALIDATION_ERROR',
      message: 'Divisão inválida.',
      fieldErrors: [],
      isNetworkError: false,
    });

    await render(<NewProgramForm onCreated={jest.fn()} onCancel={jest.fn()} />);

    await fireEvent.changeText(
      screen.getByTestId('new-program-name'),
      'Push / Pull / Legs'
    );
    await fireEvent.press(screen.getByTestId('create-program-submit'));

    await waitFor(() =>
      expect(screen.getByText('Divisão inválida.')).toBeTruthy()
    );
  });
});
