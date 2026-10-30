import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ProgramDetailsScreen } from '../src/features/programs/ProgramDetailsScreen';
import { MOCK_EXERCISES } from '../src/mocks/exercises';
import { MOCK_PROGRAMS } from '../src/mocks/programs';
import { PROGRAM_TEMPLATES } from '../src/features/programs/trainingTemplates';
import { ROUTES } from '../src/navigation/linking';
import type { Page } from '../src/types/api';
import type { Exercise } from '../src/types/exercise';
import type { WorkoutProgram } from '../src/types/program';

const mockUseProgram = jest.fn();
const mockCreateProgram = jest.fn();
const mockUpdateProgram = jest.fn();
const mockUseExerciseCatalogue = jest.fn();

jest.mock('../src/features/programs/usePrograms', () => ({
  useProgram: (id?: string) => mockUseProgram(id),
  useCreateProgram: () => mockCreateProgram(),
  useUpdateProgram: () => mockUpdateProgram(),
}));

jest.mock('../src/features/exercises/useExercises', () => {
  const { MOCK_EXERCISES: exercises } = jest.requireActual(
    '../src/mocks/exercises'
  );
  return {
    useExercises: () => ({ data: { content: exercises } }),
    useExerciseCatalogue: () => mockUseExerciseCatalogue(),
  };
});

const mockPush = router.push as jest.Mock;
const mockReplace = router.replace as jest.Mock;

function cataloguePage(
  content: Exercise[] = MOCK_EXERCISES,
  overrides: Partial<Page<Exercise>> = {}
): Page<Exercise> {
  return {
    content,
    page: 0,
    size: 200,
    totalElements: content.length,
    totalPages: 1,
    hasNext: false,
    ...overrides,
  };
}

function programResult(program?: WorkoutProgram | null) {
  return {
    data: program ?? undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

function catalogueResult(overrides: Record<string, unknown> = {}) {
  return {
    data: cataloguePage(),
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

function mutationResult(mutateAsync = jest.fn()) {
  return { mutateAsync, isPending: false };
}

const savedProgram = MOCK_PROGRAMS[0]!;
const template = PROGRAM_TEMPLATES[0]!;

describe('saved program details', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockUseProgram.mockReturnValue(programResult(savedProgram));
    mockCreateProgram.mockReturnValue(mutationResult());
    mockUpdateProgram.mockReturnValue(mutationResult());
    mockUseExerciseCatalogue.mockReturnValue(catalogueResult());
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the loading state while the program is fetched', async () => {
    mockUseProgram.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    await render(<ProgramDetailsScreen programId={savedProgram.id} />);

    expect(screen.getByTestId('program-details-loading')).toBeTruthy();
  });

  it('shows the error state and retries the request', async () => {
    const refetch = jest.fn();
    mockUseProgram.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Sem conexão com o servidor.',
        fieldErrors: [],
        isNetworkError: true,
      },
      refetch,
    });

    await render(<ProgramDetailsScreen programId={savedProgram.id} />);

    expect(screen.getByText('Sem conexão com o servidor.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a not found state when the program does not exist', async () => {
    mockUseProgram.mockReturnValue(programResult(null));

    await render(<ProgramDetailsScreen programId="missing" />);

    expect(screen.getByText('Programa não encontrado')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('program-details-back'));

    expect(mockReplace).toHaveBeenCalledWith(ROUTES.treinos);
  });

  it('lists the days without the exercises until a day is expanded', async () => {
    const day = savedProgram.days[0]!;
    await render(<ProgramDetailsScreen programId={savedProgram.id} />);

    expect(screen.getAllByText(savedProgram.name).length).toBeGreaterThan(0);
    expect(screen.getByText(day.name)).toBeTruthy();
    expect(screen.queryByTestId(`program-day-${day.id}-exercises`)).toBeNull();

    await fireEvent.press(screen.getByTestId(`program-day-${day.id}-toggle`));

    expect(screen.getByTestId(`program-day-${day.id}-exercises`)).toBeTruthy();
  });

  it('starts a day through the existing workout flow', async () => {
    const day = savedProgram.days[0]!;
    await render(<ProgramDetailsScreen programId={savedProgram.id} />);

    await fireEvent.press(screen.getByTestId(`start-day-${day.id}`));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: ROUTES.comecar,
      params: { programId: savedProgram.id, programDayId: day.id },
    });
  });

  it('edits a day in place and saves the full program structure', async () => {
    const day = savedProgram.days[0]!;
    const mutateAsync = jest.fn().mockResolvedValue({ ...savedProgram, id: savedProgram.id });
    mockUpdateProgram.mockReturnValue(mutationResult(mutateAsync));

    await render(<ProgramDetailsScreen programId={savedProgram.id} />);

    await fireEvent.press(screen.getByTestId(`program-day-${day.id}-toggle`));
    await fireEvent.press(screen.getByTestId(`edit-day-${day.id}`));
    expect(screen.getByTestId(`day-editor-${day.id}`)).toBeTruthy();

    await fireEvent.changeText(
      screen.getByTestId(`program-day-name-${day.id}`),
      'Peito e ombros'
    );
    await fireEvent.press(screen.getByTestId(`save-day-${day.id}`));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const [{ id, input }] = mutateAsync.mock.calls[0] as [
      { id: string; input: { days: { name: string }[] } },
    ];
    expect(id).toBe(savedProgram.id);
    // The backend replaces the whole program, so every day goes in the body.
    expect(input.days).toHaveLength(savedProgram.days.length);
    expect(input.days[0]!.name).toBe('Peito e ombros');
  });
});

describe('template details', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockUseProgram.mockReturnValue(programResult(savedProgram));
    mockUseExerciseCatalogue.mockReturnValue(catalogueResult());
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the template as read-only, without a start action', async () => {
    await render(
      <ProgramDetailsScreen programId={template.id} source="template" />
    );

    expect(screen.getByText(template.name)).toBeTruthy();
    expect(screen.getByTestId('template-day-0')).toBeTruthy();
    expect(screen.getByTestId('add-template-to-programs')).toBeTruthy();
    // A template has no start action: it must be copied first.
    expect(screen.queryByText('Iniciar')).toBeNull();
  });

  it('copies the template into the user programs', async () => {
    const created = { ...savedProgram, id: 'created-program' };
    const mutateAsync = jest.fn().mockResolvedValue(created);
    mockCreateProgram.mockReturnValue(mutationResult(mutateAsync));

    await render(
      <ProgramDetailsScreen programId={template.id} source="template" />
    );

    await fireEvent.press(screen.getByTestId('add-template-to-programs'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const [{ input, idempotencyKey }] = mutateAsync.mock.calls[0] as [
      { input: { name: string; days: { exercises: { exerciseId: string }[] }[] }; idempotencyKey: string },
    ];
    expect(input.name).toBe(template.name);
    expect(input.days).toHaveLength(template.days.length);
    expect(typeof idempotencyKey).toBe('string');
    expect(idempotencyKey.length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(screen.getByTestId('template-copy-success')).toBeTruthy()
    );

    await fireEvent.press(screen.getByTestId('open-created-program'));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: ROUTES.programa,
      params: { id: created.id, source: 'saved' },
    });
  });

  it('keeps the same idempotency key when the copy is retried', async () => {
    const mutateAsync = jest
      .fn()
      .mockRejectedValueOnce({
        code: 'NETWORK_ERROR',
        message: 'Sem conexão com o servidor.',
        fieldErrors: [],
        isNetworkError: true,
      })
      .mockResolvedValueOnce({ ...savedProgram, id: 'created-program' });
    mockCreateProgram.mockReturnValue(mutationResult(mutateAsync));

    await render(
      <ProgramDetailsScreen programId={template.id} source="template" />
    );

    await fireEvent.press(screen.getByTestId('add-template-to-programs'));
    await waitFor(() =>
      expect(screen.getByTestId('template-copy-error')).toBeTruthy()
    );

    await fireEvent.press(screen.getByTestId('add-template-to-programs'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));

    const firstKey = (mutateAsync.mock.calls[0] as [{ idempotencyKey: string }])[0]
      .idempotencyKey;
    const secondKey = (mutateAsync.mock.calls[1] as [{ idempotencyKey: string }])[0]
      .idempotencyKey;
    expect(secondKey).toBe(firstKey);
  });

  it('blocks the copy when an exercise is missing from the catalogue', async () => {
    const mutateAsync = jest.fn();
    mockCreateProgram.mockReturnValue(mutationResult(mutateAsync));
    mockUseExerciseCatalogue.mockReturnValue(
      catalogueResult({ data: cataloguePage([]) })
    );

    await render(
      <ProgramDetailsScreen programId={template.id} source="template" />
    );

    expect(screen.getByTestId('template-missing-exercises')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('add-template-to-programs'));

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('offers a retry when the catalogue fails to load', async () => {
    const refetch = jest.fn();
    mockUseExerciseCatalogue.mockReturnValue(
      catalogueResult({
        data: undefined,
        isError: true,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Catálogo fora do ar.',
          fieldErrors: [],
          isNetworkError: true,
        },
        refetch,
      })
    );

    await render(
      <ProgramDetailsScreen programId={template.id} source="template" />
    );

    expect(screen.getByText('Catálogo fora do ar.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar novamente'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
