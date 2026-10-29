import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { NewProgramForm } from '../src/features/programs/NewProgramForm';

const mockMutateAsync = jest.fn();

jest.mock('../src/features/programs/usePrograms', () => ({
  useCreateProgram: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('NewProgramForm', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset();
    mockMutateAsync.mockResolvedValue({});
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

  it('creates the program with the days of the split and no exercises', async () => {
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
      { input: Record<string, unknown> },
    ];
    expect(input.name).toBe('Meu ABCD');
    expect(input.splitType).toBe('ABCD');
    expect(input.days).toEqual([
      { name: 'Peito e tríceps', exercises: [] },
      { name: 'Costas e bíceps', exercises: [] },
      { name: 'Pernas e glúteos', exercises: [] },
      { name: 'Ombros e braços', exercises: [] },
    ]);

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
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
