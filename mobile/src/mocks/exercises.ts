import type { Exercise } from '../types/exercise';

export const MOCK_EXERCISES: Exercise[] = [
  {
    id: 'ex-supino-reto',
    name: 'Supino reto com barra',
    description: 'Movimento compound para peitoral, tríceps e deltoide anterior.',
    primaryMuscleGroup: 'Peito',
    secondaryMuscleGroups: ['Tríceps', 'Ombros'],
    equipment: 'Barra',
    instructions:
      'Deitado no banco, segure a barra com as mãos afastadas na altura dos ombros, desça até o peito e empurre.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-supino-inclinado',
    name: 'Supino inclinado com halteres',
    description: 'Foco no peitoral superior.',
    primaryMuscleGroup: 'Peito',
    secondaryMuscleGroups: ['Ombros', 'Tríceps'],
    equipment: 'Halteres',
    instructions:
      'Banco inclinado a 30 graus, desça os halteres controladamente até a linha do peito e empurre.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-crucifixo',
    name: 'Crucifixo na polia',
    description: 'Isolamento para peitoral.',
    primaryMuscleGroup: 'Peito',
    secondaryMuscleGroups: [],
    equipment: 'Polia',
    instructions:
      'Cabos na altura do peito, abra os braços em arco e controle o movimento de volta.',
    movementType: 'ISOLATION',
    isSystem: true,
  },
  {
    id: 'ex-puxada-frontal',
    name: 'Puxada frontal',
    description: 'Puxada vertical para dorsais e bíceps.',
    primaryMuscleGroup: 'Costas',
    secondaryMuscleGroups: ['Tríceps'],
    equipment: 'Polia',
    instructions:
      'Segure a barra com as mãos afastadas, puxe o peito em direção à barra e volte controladamente.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-remada-curva',
    name: 'Remada curvada',
    description: 'Remada horizontal para dorsais.',
    primaryMuscleGroup: 'Costas',
    secondaryMuscleGroups: ['Tríceps'],
    equipment: 'Barra',
    instructions:
      'Incline o tronco, puxe a barra em direção ao abdômen e controle a volta.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-levantamento-terra',
    name: 'Levantamento terra romeno',
    description: 'Padrão de hinge para posterior de coxa e lombar.',
    primaryMuscleGroup: 'Posteriores de coxa',
    secondaryMuscleGroups: ['Costas'],
    equipment: 'Barra',
    instructions:
      'Com joelhos levemente flexionados, incline o quadril mantendo a coluna neutra e volte à posição inicial.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-agachamento-goblet',
    name: 'Agachamento goblet',
    description: 'Agachamento com haltere junto ao peito.',
    primaryMuscleGroup: 'Quadríceps',
    secondaryMuscleGroups: ['Abdômen'],
    equipment: 'Haltere',
    instructions:
      'Segure o haltere junto ao peito, desça até que os cotovelos passem os joelhos e volte.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-legacy-press',
    name: 'Desenvolvimento militar',
    description: 'Desenvolvimento de ombros em pé.',
    primaryMuscleGroup: 'Ombros',
    secondaryMuscleGroups: ['Tríceps', 'Abdômen'],
    equipment: 'Barra',
    instructions:
      'Em pé, empurre a barra da altura dos ombros até a extensão completa, mantendo o core firme.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-elevacao-lateral',
    name: 'Elevação lateral',
    description: 'Isolamento para deltoide lateral.',
    primaryMuscleGroup: 'Ombros',
    secondaryMuscleGroups: [],
    equipment: 'Halteres',
    instructions:
      'Eleve os halteres até a altura dos ombros com cotovelos levemente flexionados.',
    movementType: 'ISOLATION',
    isSystem: true,
  },
  {
    id: 'ex-triceps-corda',
    name: 'Tríceps na corda',
    description: 'Extensão de tríceps na polia.',
    primaryMuscleGroup: 'Tríceps',
    secondaryMuscleGroups: [],
    equipment: 'Polia',
    instructions:
      'Puxe a corda até a extensão do cotovelo e separe as mãos no final do movimento.',
    movementType: 'ISOLATION',
    isSystem: true,
  },
  {
    id: 'ex-rosca-barra',
    name: 'Rosca com barra reta',
    description: 'Flexão de bíceps.',
    primaryMuscleGroup: 'Bíceps',
    secondaryMuscleGroups: [],
    equipment: 'Barra',
    instructions:
      'Em pé, supine a barra até a altura dos ombros e controle a volta.',
    movementType: 'ISOLATION',
    isSystem: true,
  },
  {
    id: 'ex-hip-flexao',
    name: 'Flexão de quadril na polia',
    description: 'Isolamento para flexores do quadril.',
    primaryMuscleGroup: 'Quadríceps',
    secondaryMuscleGroups: [],
    equipment: 'Polia',
    instructions:
      'Com o corpo na diagonal, puxe o joelho em direção ao peito de forma controlada.',
    movementType: 'ISOLATION',
    isSystem: true,
  },
  {
    id: 'ex-prancha',
    name: 'Prancha isométrica',
    description: 'Isometria para core.',
    primaryMuscleGroup: 'Abdômen',
    secondaryMuscleGroups: [],
    equipment: 'Corporal',
    instructions:
      'Apoie os antebraços no chão, mantenha o quadril alinhado e respire.',
    movementType: 'ISOMETRIC',
    isSystem: true,
  },
  {
    id: 'ex-remo-caverna',
    name: 'Remo na máquina',
    description: 'Remo horizontal com apoio no peito.',
    primaryMuscleGroup: 'Costas',
    secondaryMuscleGroups: ['Tríceps'],
    equipment: 'Máquina',
    instructions:
      ' apoie o peito, puxe o cabo em direção ao abdômen e controle a volta.',
    movementType: 'COMPOUND',
    isSystem: true,
  },
  {
    id: 'ex-corrida-banda',
    name: 'Corrida na esteira',
    description: 'Cardio de impacto moderado.',
    primaryMuscleGroup: 'Cardio',
    secondaryMuscleGroups: ['Quadríceps'],
    equipment: 'Esteira',
    instructions: 'Mantenha postura ereta e cadência constante.',
    movementType: 'CARDIO',
    isSystem: true,
  },
];

export function findMockExercise(id: string): Exercise | undefined {
  return MOCK_EXERCISES.find((exercise) => exercise.id === id);
}
