import { fireEvent, render, screen } from '@testing-library/react-native';

import { SetLogger } from '../src/features/workouts/SetLogger';
import type { LoggedSet } from '../src/features/workouts/SetLogger';

describe('SetLogger', () => {
  it('starts with a single set row', async () => {
    await render(<SetLogger exerciseName="Supino reto com barra" weightUnit="KG" />);

    expect(screen.getByTestId('set-row-1')).toBeTruthy();
    expect(screen.queryByTestId('set-row-2')).toBeNull();
    expect(screen.getByText('1 série')).toBeTruthy();
  });

  it('adds a new set row when the user asks for it', async () => {
    await render(<SetLogger exerciseName="Supino reto com barra" weightUnit="KG" />);

    await fireEvent.press(screen.getByTestId('add-set-button'));

    expect(screen.getByTestId('set-row-1')).toBeTruthy();
    expect(screen.getByTestId('set-row-2')).toBeTruthy();
    expect(screen.getByText('2 séries')).toBeTruthy();
  });

  it('removes a set row', async () => {
    await render(<SetLogger exerciseName="Supino reto com barra" weightUnit="KG" />);

    await fireEvent.press(screen.getByTestId('add-set-button'));
    await fireEvent.press(screen.getByTestId('set-remove-2'));

    expect(screen.queryByTestId('set-row-2')).toBeNull();
    expect(screen.getByTestId('set-row-1')).toBeTruthy();
  });

  it('fills the rows with the values of the last session', async () => {
    await render(
      <SetLogger
        exerciseName="Supino reto com barra"
        weightUnit="KG"
        previousSets={[
          { setNumber: 1, weightKg: 80, repetitions: 8, perceivedExertion: 7 },
          { setNumber: 2, weightKg: 82.5, repetitions: 8, perceivedExertion: 8 },
        ]}
      />
    );

    await fireEvent.press(screen.getByTestId('use-previous-values-button'));

    expect(screen.getByTestId('set-weight-input-1').props.value).toBe('80');
    expect(screen.getByTestId('set-reps-input-1').props.value).toBe('8');
    expect(screen.getByTestId('set-rpe-input-1').props.value).toBe('7');
  });

  it('creates a row from the last session when the logger is empty', async () => {
    await render(
      <SetLogger
        exerciseName="Agachamento goblet"
        weightUnit="KG"
        previousSets={[
          { setNumber: 1, weightKg: 55, repetitions: 10, perceivedExertion: null },
        ]}
      />
    );

    await fireEvent.press(screen.getByTestId('use-previous-values-button'));

    expect(screen.getByTestId('set-weight-input-1').props.value).toBe('55');
    expect(screen.getByTestId('set-reps-input-1').props.value).toBe('10');
    expect(screen.getByTestId('set-rpe-input-1').props.value).toBe('');
  });

  it('converts the weight to the unit preferred by the user', async () => {
    await render(
      <SetLogger
        exerciseName="Supino reto com barra"
        weightUnit="LB"
        previousSets={[
          { setNumber: 1, weightKg: 100, repetitions: 5, perceivedExertion: null },
        ]}
      />
    );

    await fireEvent.press(screen.getByTestId('use-previous-values-button'));

    // 100 kg is roughly 220.5 lb.
    expect(screen.getByTestId('set-weight-input-1').props.value).toBe('220.5');
  });

  it('blocks the submission when a field is invalid', async () => {
    const onSubmit = jest.fn();
    await render(
      <SetLogger
        exerciseName="Supino reto com barra"
        weightUnit="KG"
        onSubmit={onSubmit}
      />
    );

    await fireEvent.changeText(screen.getByTestId('set-weight-input-1'), '80');
    await fireEvent.changeText(screen.getByTestId('set-reps-input-1'), '0');
    await fireEvent.press(screen.getByTestId('save-sets-button'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('set-error-1')).toBeTruthy();
  });

  it('submits the sets converted to kilograms', async () => {
    const onSubmit = jest.fn<void, [LoggedSet[]]>();
    await render(
      <SetLogger
        exerciseName="Supino reto com barra"
        weightUnit="KG"
        onSubmit={onSubmit}
      />
    );

    await fireEvent.changeText(screen.getByTestId('set-weight-input-1'), '80');
    await fireEvent.changeText(screen.getByTestId('set-reps-input-1'), '8');
    await fireEvent.changeText(screen.getByTestId('set-rpe-input-1'), '8');
    await fireEvent.press(screen.getByTestId('save-sets-button'));

    expect(onSubmit).toHaveBeenCalledWith([
      { setNumber: 1, weightKg: 80, repetitions: 8, perceivedExertion: 8 },
    ]);
  });

  it('shows a message when there is no history for the exercise', async () => {
    await render(<SetLogger exerciseName="Exercício novo" weightUnit="KG" />);

    expect(screen.queryByTestId('use-previous-values-button')).toBeNull();
    expect(
      screen.getByText('Sem histórico para este exercício. Registre a primeira série.')
    ).toBeTruthy();
  });
});
