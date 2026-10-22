import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from '../src/components/Screen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({
      top: 24,
      right: 0,
      bottom: 16,
      left: 0,
    }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 360, height: 800 }),
  };
});

describe('Screen', () => {
  it('renders the title, the subtitle and the content', async () => {
    await render(
      <Screen title="Início" subtitle="Treine com inteligência." testID="screen">
        <Text>Conteúdo da tela</Text>
      </Screen>
    );

    expect(screen.getByText('Início')).toBeTruthy();
    expect(screen.getByText('Treine com inteligência.')).toBeTruthy();
    expect(screen.getByText('Conteúdo da tela')).toBeTruthy();
  });

  it('applies the safe area insets so the content is never under the system bars', async () => {
    await render(
      <Screen title="Início" testID="screen">
        <Text>Conteúdo</Text>
      </Screen>
    );

    expect(screen.getByTestId('screen')).toHaveStyle({ paddingTop: 24 });
  });

  it('supports a screen without a title', async () => {
    await render(
      <Screen testID="screen">
        <Text>Sem título</Text>
      </Screen>
    );

    expect(screen.queryByText('Início')).toBeNull();
    expect(screen.getByText('Sem título')).toBeTruthy();
  });
});
