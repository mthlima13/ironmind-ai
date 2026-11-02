import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from '../__mocks__/expo-router';
import ProfileScreen from '../app/(tabs)/perfil';
import { ROUTES } from '../src/navigation/linking';

const mockMutate = jest.fn();

jest.mock('../src/features/auth/useProfile', () => ({
  profileQueryKeys: { me: ['users', 'me'] },
  useProfile: () => ({ data: mockProfile, isLoading: false, isError: false, error: null, refetch: jest.fn() }),
  useUpdateProfile: () => ({ mutate: mockMutate }),
}));

jest.mock('../src/features/profile/useRestrictions', () => ({
  useRestrictions: () => ({ data: mockRestrictions }),
}));

/** Same shape the API returns (src/types/user.ts UserProfile). */
let mockProfile = {
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

const mockRestrictions: unknown[] = [];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps identity, training preferences and restrictions only', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByTestId('profile-screen')).toBeTruthy();
    expect(screen.getByText('Conta')).toBeTruthy();
    expect(screen.getByText('Preferências de treino')).toBeTruthy();
    expect(screen.getByText('Limitações e exercícios a evitar')).toBeTruthy();
    // The account actions moved to the dedicated settings screen.
    expect(screen.queryByText('Excluir conta')).toBeNull();
    expect(screen.queryByText('Privacidade')).toBeNull();
    expect(screen.queryByTestId('profile-logout')).toBeNull();
  });

  it('never saves training days above 7 (button disabled at the cap)', async () => {
    mockProfile = {
      ...mockProfile,
      preferences: { ...mockProfile.preferences, trainingDays: 7 },
    };

    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-days-increase'));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('never saves training days below 2 (button disabled at the floor)', async () => {
    mockProfile = {
      ...mockProfile,
      preferences: { ...mockProfile.preferences, trainingDays: 2 },
    };

    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-days-decrease'));

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('saves a training day change inside the range', async () => {
    mockProfile = {
      ...mockProfile,
      preferences: { ...mockProfile.preferences, trainingDays: 4 },
    };

    await render(<ProfileScreen />);

    await fireEvent.press(screen.getByTestId('profile-days-increase'));

    expect(mockMutate).toHaveBeenCalledWith({
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
