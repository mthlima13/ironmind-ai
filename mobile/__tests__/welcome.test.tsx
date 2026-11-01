import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from '../__mocks__/expo-router';
import { WelcomeScreen } from '../src/features/auth/WelcomeScreen';
import { ROUTES } from '../src/navigation/linking';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the frozen hero composition', async () => {
    await render(<WelcomeScreen />);

    expect(screen.getByTestId('welcome-screen')).toBeTruthy();
    expect(screen.getByText('IronFit')).toBeTruthy();
    expect(screen.getByText(/Treine com inteligência/)).toBeTruthy();
  });

  it('renders the language badge as static pt-BR', async () => {
    await render(<WelcomeScreen />);

    expect(screen.getByTestId('welcome-lang')).toBeTruthy();
    expect(screen.getByText('PT')).toBeTruthy();
  });

  it('renders the three highlighted features', async () => {
    await render(<WelcomeScreen />);

    expect(screen.getAllByTestId('welcome-feature')).toHaveLength(3);
    expect(screen.getByText('Planos de treino personalizados')).toBeTruthy();
    expect(
      screen.getByText(
        /acompanhamento por um profissional/i
      )
    ).toBeTruthy();
    expect(screen.getByText(/seu nível/i)).toBeTruthy();
  });

  it('continues to the sign-up form', async () => {
    await render(<WelcomeScreen />);

    await fireEvent.press(screen.getByTestId('welcome-cta'));

    expect(router.push).toHaveBeenCalledWith(ROUTES.register);
  });

  it('both Entrar actions go to the login screen', async () => {
    await render(<WelcomeScreen />);

    await fireEvent.press(screen.getByTestId('welcome-go-login'));
    expect(router.push).toHaveBeenCalledWith(ROUTES.login);

    await fireEvent.press(screen.getByTestId('welcome-go-login-bottom'));
    expect(router.push).toHaveBeenCalledWith(ROUTES.login);
  });

  it('shows the legal words as plain text while the URLs are not configured', async () => {
    await render(<WelcomeScreen />);

    // Same honesty rule as the profile screen: the pair is rendered, but
    // nothing is a link until EXPO_PUBLIC_* URLS are configured.
    expect(screen.getByText('Termos')).toBeTruthy();
    expect(screen.getByText('Política de Privacidade')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Termos' })).toBeNull();
    expect(
      screen.queryByRole('link', { name: 'Política de Privacidade' })
    ).toBeNull();
  });
});
