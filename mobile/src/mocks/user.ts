import type { InjuryRestriction, UserProfile } from '../types/user';

export const MOCK_USER_PROFILE: UserProfile = {
  user: {
    id: 'usr-0001',
    name: 'Alex Morgan',
    email: 'alex@ironmind.ai',
    role: 'USER',
  },
  preferences: {
    preferredUnits: 'KG',
    trainingExperience: 'INTERMEDIATE',
    goal: 'HYPERTROPHY',
    availableEquipment: ['Barra', 'Halteres', 'Polia', 'Máquina'],
    trainingDays: 4,
    privacySettings: {
      publicProfile: false,
      showRecords: true,
      allowSharing: false,
    },
  },
  timezone: 'America/Sao_Paulo',
};

export const MOCK_RESTRICTIONS: InjuryRestriction[] = [
  {
    id: 'rst-0001',
    bodyRegion: 'Ombro direito',
    description:
      'Lesão no manguito rotador. Evitar movimentos com impacto acima da cabeça.',
    isActive: true,
    exerciseIds: ['ex-legacy-press', 'ex-elevacao-lateral'],
  },
];
