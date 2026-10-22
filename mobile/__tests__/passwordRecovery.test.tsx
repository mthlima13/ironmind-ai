import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { searchParams } from '../__mocks__/expo-router';
import {
  ForgotPasswordScreen,
  RECOVERY_MESSAGE,
} from '../src/features/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../src/features/auth/ResetPasswordScreen';
import { api, DEFAULT_MESSAGES } from '../src/services/api';
import { API_ERROR_CODES } from '../src/types/api';

const INVALID_TOKEN_MESSAGE =
  DEFAULT_MESSAGES[API_ERROR_CODES.INVALID_RESET_TOKEN];

describe('forgot password screen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the same message whether the e-mail exists or not', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: {} } as never);

    await render(<ForgotPasswordScreen />);

    expect(screen.getByText(RECOVERY_MESSAGE)).toBeTruthy();
  });

  it('asks the API for the instructions', async () => {
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { message: 'ok' } } as never);

    await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(
      screen.getByTestId('forgot-password-email'),
      'alguem@exemplo.com'
    );
    await fireEvent.press(screen.getByTestId('forgot-password-submit'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'alguem@exemplo.com',
      });
    });
  });

  it('keeps the honest message after the request', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({ data: {} } as never);

    await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(
      screen.getByTestId('forgot-password-email'),
      'alguem@exemplo.com'
    );
    await fireEvent.press(screen.getByTestId('forgot-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-success')).toBeTruthy();
    });
    expect(screen.getByText(RECOVERY_MESSAGE)).toBeTruthy();
  });

  it('validates the e-mail before sending the request', async () => {
    const post = jest.spyOn(api, 'post');

    await render(<ForgotPasswordScreen />);

    await fireEvent.changeText(
      screen.getByTestId('forgot-password-email'),
      'nao-e-email'
    );
    await fireEvent.press(screen.getByTestId('forgot-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-email-error')).toBeTruthy();
    });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('reset password screen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    searchParams.current = {};
  });

  it('sends the token of the deep link with the new password', async () => {
    searchParams.current = { token: 'token-abc' };
    const post = jest
      .spyOn(api, 'post')
      .mockResolvedValue({ data: '' } as never);

    await render(<ResetPasswordScreen />);

    await fireEvent.changeText(
      screen.getByTestId('reset-password-password'),
      'abc12345'
    );
    await fireEvent.changeText(
      screen.getByTestId('reset-password-confirm-password'),
      'abc12345'
    );
    await fireEvent.press(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'token-abc',
        newPassword: 'abc12345',
      });
    });
  });

  it('uses the same password rule of the API', async () => {
    searchParams.current = { token: 'token-abc' };
    const post = jest.spyOn(api, 'post');

    await render(<ResetPasswordScreen />);

    await fireEvent.changeText(screen.getByTestId('reset-password-password'), 'abc');
    await fireEvent.changeText(
      screen.getByTestId('reset-password-confirm-password'),
      'abc'
    );
    await fireEvent.press(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-password-error')).toBeTruthy();
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('shows a clear message when the token is invalid', async () => {
    searchParams.current = { token: 'expired-token' };
    jest.spyOn(api, 'post').mockRejectedValue({
      code: API_ERROR_CODES.INVALID_RESET_TOKEN,
      message: INVALID_TOKEN_MESSAGE,
      fieldErrors: [],
      isNetworkError: false,
    });

    await render(<ResetPasswordScreen />);

    await fireEvent.changeText(
      screen.getByTestId('reset-password-password'),
      'abc12345'
    );
    await fireEvent.changeText(
      screen.getByTestId('reset-password-confirm-password'),
      'abc12345'
    );
    await fireEvent.press(screen.getByTestId('reset-password-submit'));

    await waitFor(() => {
      expect(screen.getByText(INVALID_TOKEN_MESSAGE)).toBeTruthy();
    });
  });

  it('warns when the deep link has no token', async () => {
    searchParams.current = {};

    await render(<ResetPasswordScreen />);

    expect(screen.getByText(INVALID_TOKEN_MESSAGE)).toBeTruthy();
  });
});
