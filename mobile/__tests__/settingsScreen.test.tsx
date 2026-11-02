import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import {
  DEFAULT_THEME_MODE,
  ThemeProvider,
  useThemeStore,
} from '../src/theme';
import { SettingsScreen } from '../src/features/settings/SettingsScreen';

jest.mock('../src/storage/preferences', () => ({
  loadPreference: jest.fn(async () => null),
  savePreference: jest.fn(async () => undefined),
}));

jest.mock('../src/services/permissions', () => ({
  describeNotificationPermission: () => 'Permissão de notificações concedida.',
  requestNotificationPermission: (...args: unknown[]) =>
    mockRequestNotifications(...(args as [])),
}));

const mockLogout = jest.fn(async () => undefined);
const mockDeleteAccount = jest.fn(async () => undefined);
const mockMutate = jest.fn();
const mockRequestNotifications = jest.fn(async () => 'granted');

jest.mock('../src/features/auth/useAuth', () => ({
  useLogout: () => ({ logout: mockLogout, isSubmitting: false }),
  useDeleteAccount: () => ({
    deleteAccount: mockDeleteAccount,
    isSubmitting: false,
    error: null,
    clearError: jest.fn(),
  }),
}));

jest.mock('../src/features/auth/useProfile', () => ({
  profileQueryKeys: { me: ['users', 'me'] },
  useProfile: () => ({
    data: mockProfile,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateProfile: () => ({ mutate: mockMutate }),
}));


/** Same shape the API returns (src/types/user.ts UserProfile). */
const mockProfile = {
  user: { id: 'u1', name: 'Thiago', email: 'thiago@email.com', role: 'USER' },
  timezone: 'America/Sao_Paulo',
  preferences: {
    preferredUnits: 'KG',
    trainingExperience: 'INTERMEDIATE',
    goal: 'HYPERTROPHY',
    availableEquipment: [],
    trainingDays: 4,
    privacySettings: {
      publicProfile: false,
      showRecords: true,
      allowSharing: false,
    },
  },
};

const renderSettings = async () => {
  const utils = render(
    <ThemeProvider>
      <SettingsScreen />
    </ThemeProvider>
  );
  await waitFor(() => useThemeStore.getState().hydrated);
  return utils;
};

beforeEach(() => {
  jest.clearAllMocks();
  useThemeStore.setState({ mode: DEFAULT_THEME_MODE, hydrated: false });
});

describe('SettingsScreen', () => {
  it('renders appearance, privacy, notifications and account sections', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-screen')).toBeTruthy();
    expect(screen.getByText('Aparência')).toBeTruthy();
    expect(screen.getByTestId('settings-theme')).toBeTruthy();
    expect(screen.getByText('Privacidade')).toBeTruthy();
    expect(screen.getByText('Notificações')).toBeTruthy();
    expect(screen.getByTestId('settings-logout')).toBeTruthy();
    expect(screen.getByTestId('settings-delete-account')).toBeTruthy();
  });

  it('changes the local theme without any API call', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings-theme-light'));

    await waitFor(() => {
      expect(useThemeStore.getState().mode).toBe('light');
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('saves privacy switches as a full privacySettings patch', async () => {
    await renderSettings();

    await fireEvent(
      screen.getByTestId('settings-privacy-public'),
      'valueChange',
      true
    );

    expect(mockMutate).toHaveBeenCalledWith({
      preferences: {
        privacySettings: {
          publicProfile: true,
          showRecords: true,
          allowSharing: false,
        },
      },
    });
  });

  it('requests the notification permission on tap', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings-notification-permission'));

    expect(mockRequestNotifications).toHaveBeenCalled();
  });

  it('logs the user out from the dedicated action', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings-logout'));

    expect(mockLogout).toHaveBeenCalled();
  });

  it('deletes the account only after the password confirmation', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings-delete-account'));
    await fireEvent.changeText(
      screen.getByTestId('settings-delete-password'),
      'senha-forte-123'
    );
    await fireEvent.press(screen.getByTestId('settings-delete-confirm'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('senha-forte-123');
    });
  });

  it('hides the legal links while the URLs are not configured', async () => {
    await renderSettings();

    // Same honesty rule as the welcome screen: without EXPO_PUBLIC_* URLs
    // the app renders nothing (never a placeholder link).
    expect(screen.queryByTestId('settings-privacy-policy')).toBeNull();
    expect(screen.queryByTestId('settings-terms-of-use')).toBeNull();
  });
});
