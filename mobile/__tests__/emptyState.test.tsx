import { fireEvent, render, screen } from '@testing-library/react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '../src/components/EmptyState';

describe('EmptyState', () => {
  it('renders the title and the description', async () => {
    await render(
      <EmptyState
        title="Nenhum treino ainda"
        description="Comece criando seu primeiro programa."
        testID="empty-state"
      />
    );

    expect(screen.getByText('Nenhum treino ainda')).toBeTruthy();
    expect(screen.getByText('Comece criando seu primeiro programa.')).toBeTruthy();
  });

  it('calls the first use action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="Nenhum treino ainda"
        description="Comece criando seu primeiro programa."
        actionLabel="Criar programa"
        onAction={onAction}
        testID="empty-state"
      />
    );

    await fireEvent.press(screen.getByTestId('empty-state-action'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render the action when there is no handler', async () => {
    await render(
      <EmptyState
        title="Nenhum treino ainda"
        actionLabel="Criar programa"
        testID="empty-state"
      />
    );

    expect(screen.queryByTestId('empty-state-action')).toBeNull();
  });

  it('renders an optional icon', async () => {
    await render(
      <EmptyState
        title="Nenhum treino ainda"
        icon={<Ionicons name="barbell-outline" size={24} />}
        testID="empty-state"
      />
    );

    expect(screen.getByTestId('empty-state')).toBeTruthy();
  });
});
