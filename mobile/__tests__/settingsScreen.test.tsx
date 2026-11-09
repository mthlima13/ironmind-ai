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

const mockUpdateProfile = jest.fn(async () => undefined);
const mockResetLocalData = jest.fn(async () => undefined);
const mockRequestNotifications = jest.fn(async () => 'granted');

jest.mock('../src/features/auth/useAuth', () => ({
  useAuthState: () => ({
    status: 'authenticated',
    user: { id: '11111111-2222-4333-8444-555555555555', name: 'Thiago' },
    preferences: mockPreferences,
  }),
  useUpdateProfile: () => ({ updateProfile: mockUpdateProfile }),
  useResetLocalData: () => ({
    resetLocalData: mockResetLocalData,
    isSubmitting: false,
  }),
}));

/** Same shape the local profile has (src/types/user.ts UserPreferences). */
const mockPreferences = {
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
  it('renders appearance, privacy, notifications and local data sections', async () => {
    await renderSettings();

    expect(screen.getByTestId('settings-screen')).toBeTruthy();
    expect(screen.getByText('Aparência')).toBeTruthy();
    expect(screen.getByTestId('settings-theme')).toBeTruthy();
    expect(screen.getByText('Privacidade')).toBeTruthy();
    expect(screen.getByText('Notificações')).toBeTruthy();
    expect(screen.getByTestId('settings-wipe-data')).toBeTruthy();
  });

  it('changes the local theme without touching the training profile', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings-theme-light'));

    await waitFor(() => {
      expect(useThemeStore.getState().mode).toBe('light');
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('saves privacy switches as a full privacySettings patch', async () => {
    await renderSettings();

    await fireEvent(
      screen.getByTestId('settings-privacy-public'),
      'valueChange',
      true
    );

    expect(mockUpdateProfile).toHaveBeenCalledWith({
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

  it('never offers logout or account deletion', async () => {
    await renderSettings();

    // The account belongs to the identity provider (SPEC 11.1); the screen
    // only manages the data of the installation.
    expect(screen.queryByTestId('settings-logout')).toBeNull();
    expect(screen.queryByTestId('settings-delete-account')).toBeNull();
  });

  it('wipes the local data only after the explicit confirmation', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings-wipe-data'));
    expect(mockResetLocalData).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('settings-wipe-confirm'));

    await waitFor(() => {
      expect(mockResetLocalData).toHaveBeenCalled();
    });
  });

  it('cancels the wipe without erasing anything', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByTestId('settings-wipe-data'));
    await fireEvent.press(screen.getByTestId('settings-wipe-cancel'));

    expect(mockResetLocalData).not.toHaveBeenCalled();
  });

  it('hides the legal links while the URLs are not configured', async () => {
    await renderSettings();

    // Same honesty rule as the welcome screen: without EXPO_PUBLIC_* URLs
    // the app renders nothing (never a placeholder link).
    expect(screen.queryByTestId('settings-privacy-policy')).toBeNull();
    expect(screen.queryByTestId('settings-terms-of-use')).toBeNull();
  });
});
