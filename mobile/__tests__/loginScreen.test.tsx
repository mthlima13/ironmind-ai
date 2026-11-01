import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from '../__mocks__/expo-router';
import { useAuthStore } from '../src/features/auth/auth.store';
import { LoginScreen } from '../src/features/auth/LoginScreen';

/**
 * The login screen mirrors `ironmind-design/screens/login.html`.
 *
 * These assertions keep the copy and the entry points aligned with the design,
 * so a future refactor does not bring back the old logo/badge layout.
 */
describe('login screen', () => {
  beforeEach(() => {
    useAuthStore.setState({ error: null, isSubmitting: false });
    router.push.mockClear();
  });

  it('renders the design copy and the form', async () => {
    await render(<LoginScreen />);

    expect(screen.getByText('IronFit')).toBeTruthy();
    expect(screen.getByText('Treine com inteligência.')).toBeTruthy();
    expect(
      screen.getByText('Evolua com dados. Entre para registrar suas séries.')
    ).toBeTruthy();
    expect(screen.getByPlaceholderText('voce@email.com')).toBeTruthy();
    expect(screen.getByTestId('login-submit')).toBeTruthy();
    expect(screen.queryByText('Acesso à sua conta')).toBeNull();
  });

  it('opens the registration and the password recovery screens', async () => {
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByTestId('login-go-register'));
    expect(router.push).toHaveBeenCalledWith('/auth/register');

    await fireEvent.press(screen.getByTestId('login-go-forgot-password'));
    expect(router.push).toHaveBeenCalledWith('/auth/forgot-password');
  });
});
