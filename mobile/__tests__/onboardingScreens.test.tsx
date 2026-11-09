import { fireEvent, render, screen } from '@testing-library/react-native';

import { router } from '../__mocks__/expo-router';
import { ComingSoonScreen } from '../src/features/auth/ComingSoonScreen';
import { PreferencesScreen } from '../src/features/auth/PreferencesScreen';
import { RoleScreen } from '../src/features/auth/RoleScreen';
import { ROUTES } from '../src/navigation/linking';

const mockCompleteOnboarding = jest.fn(async () => undefined);

jest.mock('../src/features/auth/useAuth', () => ({
  useCompleteOnboarding: () => ({
    completeOnboarding: mockCompleteOnboarding,
    isSubmitting: false,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RoleScreen', () => {
  it('asks for the persona with both role cards', async () => {
    await render(<RoleScreen />);

    expect(screen.getByTestId('role-screen')).toBeTruthy();
    expect(screen.getByText('Quem é você?')).toBeTruthy();
    expect(screen.getByText('Sou aluno')).toBeTruthy();
    expect(screen.getByText('Sou personal trainer')).toBeTruthy();
    expect(screen.getByText('Em breve')).toBeTruthy();
  });

  it('sends the student to the sign-up form', async () => {
    await render(<RoleScreen />);

    await fireEvent.press(screen.getByTestId('role-student'));

    expect(router.push).toHaveBeenCalledWith(ROUTES.register);
  });

  it('sends the personal trainer to the coming soon screen', async () => {
    await render(<RoleScreen />);

    await fireEvent.press(screen.getByTestId('role-personal'));

    expect(router.push).toHaveBeenCalledWith(ROUTES.embreve);
  });
});

describe('ComingSoonScreen', () => {
  it('shows the phase 2 interstitial and keeps the flow alive', async () => {
    await render(<ComingSoonScreen />);

    expect(screen.getByTestId('coming-soon-screen')).toBeTruthy();
    expect(screen.getByTestId('coming-soon-phase-badge')).toBeTruthy();
    expect(
      screen.queryByText(/modo personal trainer está em desenvolvimento/i)
    ).not.toBeNull();

    await fireEvent.press(screen.getByTestId('coming-soon-continue-student'));
    expect(router.push).toHaveBeenCalledWith(ROUTES.register);

    await fireEvent.press(screen.getByTestId('coming-soon-back-role'));
    expect(router.push).toHaveBeenCalledWith(ROUTES.funcao);
  });
});

describe('PreferencesScreen (step 2 of the sign-up)', () => {
  it('offers the unit, experience, goal and weekly days', async () => {
    await render(<PreferencesScreen />);

    expect(screen.getByTestId('preferences-screen')).toBeTruthy();
    expect(screen.getByTestId('step-chip-2-active')).toBeTruthy();
    expect(screen.getByText('Unidade de peso')).toBeTruthy();
    expect(screen.getByText('Experiência')).toBeTruthy();
    expect(screen.getByText('Objetivo')).toBeTruthy();
    expect(screen.getByTestId('preferences-days')).toBeTruthy();
  });

  it('starts from the product defaults of a brand new account', async () => {
    await render(<PreferencesScreen />);

    // SPEC 6.4: a new account has no fake data, so the preference step shows
    // product defaults (kg, Iniciante, Hipertrofia, 4 days).
    expect(screen.getByTestId('preferences-units-KG')).toBeTruthy();
    expect(screen.getByTestId('preferences-experience-BEGINNER')).toBeTruthy();
    expect(screen.getByTestId('preferences-goal-HYPERTROPHY')).toBeTruthy();
    expect(screen.getByTestId('preferences-days').props.children).toBe(4);
  });

  it('saves the chosen preferences and lands the user on the dashboard', async () => {
    await render(<PreferencesScreen />);

    await fireEvent.press(screen.getByTestId('preferences-units-LB'));
    await fireEvent.press(screen.getByTestId('preferences-experience-INTERMEDIATE'));
    await fireEvent.press(screen.getByTestId('preferences-goal-STRENGTH'));

    // Ten presses try to exceed the maximum (4 + 10 = 14): it clamps at 7.
    for (let index = 0; index < 10; index += 1) {
      await fireEvent.press(screen.getByTestId('preferences-days-increase'));
    }

    await fireEvent.press(screen.getByTestId('preferences-submit'));

    // The preferences are patched over the product defaults (SPEC 10.2);
    // the name comes from the previous step (empty here, without params).
    expect(mockCompleteOnboarding).toHaveBeenCalledWith({
      name: '',
      preferences: {
        preferredUnits: 'LB',
        trainingExperience: 'INTERMEDIATE',
        goal: 'STRENGTH',
        trainingDays: 7,
        availableEquipment: [],
        privacySettings: {
          publicProfile: false,
          showRecords: true,
          allowSharing: false,
        },
      },
    });
    expect(router.replace).toHaveBeenCalledWith(ROUTES.inicio);
  });
});
