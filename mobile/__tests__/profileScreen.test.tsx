import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from '../__mocks__/expo-router';
import ProfileScreen from '../app/(tabs)/perfil';
import { ROUTES } from '../src/navigation/linking';

const mockUpdateProfile = jest.fn();

jest.mock('../src/features/auth/useAuth', () => ({
  useAuthState: () => ({
    status: 'authenticated',
    user: mockUser,
    preferences: mockPreferences,
  }),
  useUpdateProfile: () => ({ updateProfile: mockUpdateProfile }),
}));

jest.mock('../src/features/profile/useRestrictions', () => ({
  useRestrictions: () => ({ data: mockRestrictions }),
}));

/** Same shape the local profile has (src/types/user.ts UserIdentity). */
let mockUser = { id: '11111111-2222-4333-8444-555555555555', name: 'Thiago' };

let mockPreferences = {
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

const mockRestrictions: unknown[] = [];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileScreen', () => {
  it('keeps identity, training preferences and restrictions only', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByTestId('profile-screen')).toBeTruthy();
    expect(screen.getAllByText('Perfil').length).toBeGreaterThan(0);
    expect(screen.getByText('Preferências de treino')).toBeTruthy();
    expect(screen.getByText('Limitações e exercícios a evitar')).toBeTruthy();
    // The local data actions moved to the dedicated settings screen.
    expect(screen.queryByText('Apagar dados deste aparelho')).toBeNull();
    expect(screen.queryByText('Privacidade')).toBeNull();
    expect(screen.queryByTestId('profile-logout')).toBeNull();
  });

  it('never saves training days above 7 (button disabled at the cap)', async () => {
    mockPreferences = {
      ...mockPreferences,
      trainingDays: 7,
    };

    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-days-increase'));

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('never saves training days below 2 (button disabled at the floor)', async () => {
    mockPreferences = {
      ...mockPreferences,
      trainingDays: 2,
    };

    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-days-decrease'));

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('saves a training day change inside the range', async () => {
    mockPreferences = {
      ...mockPreferences,
      trainingDays: 4,
    };

    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-days-increase'));

    expect(mockUpdateProfile).toHaveBeenCalledWith({
      preferences: { trainingDays: 5 },
    });
  });

  it('opens the dedicated settings screen from the Gerais list item', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByText('Gerais')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('profile-open-settings'));

    expect(router.push).toHaveBeenCalledWith(ROUTES.configuracoes);
  });
});
