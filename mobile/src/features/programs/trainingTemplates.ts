import type { Exercise } from '../../types/exercise';
import type { CreateProgramInput, SplitType } from '../../types/program';
import {
  TRAINING_EXPERIENCE,
  type TrainingExperience,
  type TrainingGoal,
} from '../../types/user';

/**
 * Level of a program template.
 *
 * The catalogue has no persisted level and the backend has no public program
 * catalogue, so the templates live in the app as read-only models. Copying one
 * creates an independent program owned by the user through the existing
 * `POST /programs` endpoint (SPEC RF-005).
 */
export type ProgramLevel = TrainingExperience;

/** Levels from the easiest to the hardest, used by the filters and the cards. */
export const PROGRAM_LEVELS: ProgramLevel[] = [
  TRAINING_EXPERIENCE.BEGINNER,
  TRAINING_EXPERIENCE.INTERMEDIATE,
  TRAINING_EXPERIENCE.ADVANCED,
];

export const PROGRAM_LEVEL_LABELS: Record<ProgramLevel, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
};

/** Filter of the "Explorar" tab; `ALL` is not a level. */
export const PROGRAM_LEVEL_FILTERS = ['ALL', ...PROGRAM_LEVELS] as const;

export type ProgramLevelFilter = (typeof PROGRAM_LEVEL_FILTERS)[number];

export type TemplateExercise = {
  /** Name in the canonical catalogue seeded by the backend. */
  name: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restSeconds: number;
};

export type TemplateDay = {
  name: string;
  exercises: TemplateExercise[];
};

export type ProgramTemplate = {
  id: string;
  name: string;
  description: string;
  level: ProgramLevel;
  goal: TrainingGoal;
  splitType: SplitType;
  days: TemplateDay[];
};

/**
 * Alternative names accepted by the resolver.
 *
 * The in-app mock backend ships a shorter catalogue with a few different
 * labels. The aliases keep the templates usable while the mock is enabled
 * without changing the canonical names sent to the real backend.
 */
const EXERCISE_ALIASES: Record<string, string[]> = {
  'Agachamento goblin': ['Agachamento goblet'],
  'Crucifixo com halteres': ['Crucifixo na polia'],
  'Desenvolvimento com barra em pé': ['Desenvolvimento militar'],
  'Elevação lateral com halteres': ['Elevação lateral'],
  Prancha: ['Prancha isométrica'],
  'Remada na máquina': ['Remo na máquina'],
  'Rosca alternada com halteres': ['Rosca com barra reta'],
  'Rosca direta com barra': ['Rosca com barra reta'],
  'Supino inclinado com barra': ['Supino inclinado com halteres'],
  'Tríceps na polia com corda': ['Tríceps na corda'],
  Esteira: ['Corrida na esteira'],
};

function exercise(name: string, targetSets: number, targetRepsMin: number, targetRepsMax: number, restSeconds: number): TemplateExercise {
  return { name, targetSets, targetRepsMin, targetRepsMax, restSeconds };
}

/**
 * Read-only models of the "Explorar" tab.
 *
 * Every day count matches the split accepted by the backend, so a copy never
 * ends in a `422`. The canonical exercise names come from
 * `backend/src/main/resources/catalog/exercises.json`.
 *
 * Each session has 6 to 8 exercises. The beginner models stay with two to
 * three sets of 8-12 repetitions and two sessions a week (ACSM 2026: all major
 * muscles at least twice a week, ~10 hard sets per muscle per week). The
 * intermediate models add volume and a fourth session. The advanced models use
 * heavier strength work, more weekly volume and isolation variety, following
 * the volume landmarks of Renaissance Periodization (~10-20 hard sets per
 * muscle per week) and the structure of PHUL and the Arnold split.
 */
export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'template-full-body-iniciante',
    name: 'Full Body Iniciante',
    description:
      'Dois treinos de corpo inteiro por semana para as primeiras 8 a 12 semanas. De 2 a 3 séries de 8 a 12 repetições, com foco em técnica, respiração e progressão de carga.',
    level: TRAINING_EXPERIENCE.BEGINNER,
    goal: 'GENERAL',
    splitType: 'FULL_BODY',
    days: [
      {
        name: 'Corpo inteiro A',
        exercises: [
          exercise('Agachamento goblin', 3, 8, 12, 90),
          exercise('Supino reto com barra', 3, 8, 12, 90),
          exercise('Puxada frontal', 3, 8, 12, 90),
          exercise('Desenvolvimento com halteres sentado', 2, 10, 12, 60),
          exercise('Rosca direta com barra', 2, 10, 12, 60),
          exercise('Tríceps na polia com corda', 2, 10, 15, 60),
          exercise('Panturrilha em pé na máquina', 2, 12, 15, 60),
          exercise('Prancha', 2, 30, 45, 45),
        ],
      },
      {
        name: 'Corpo inteiro B',
        exercises: [
          exercise('Leg press 45 graus', 3, 8, 12, 90),
          exercise('Levantamento terra romeno', 3, 8, 10, 90),
          exercise('Supino inclinado com halteres', 3, 8, 12, 90),
          exercise('Remada baixa na polia', 3, 8, 12, 90),
          exercise('Elevação lateral com halteres', 2, 12, 15, 60),
          exercise('Rosca alternada com halteres', 2, 10, 12, 60),
          exercise('Abdominal com haltere', 2, 12, 15, 45),
          exercise('Panturrilha sentado', 2, 12, 15, 60),
        ],
      },
    ],
  },
  {
    id: 'template-ab-iniciante',
    name: 'AB Iniciante',
    description:
      'Superior e inferior em dois dias, para quem já domina a técnica do corpo inteiro. De 2 a 3 séries de 8 a 12 repetições, com pelo menos um dia de descanso entre as sessões.',
    level: TRAINING_EXPERIENCE.BEGINNER,
    goal: 'HYPERTROPHY',
    splitType: 'AB',
    days: [
      {
        name: 'Superior',
        exercises: [
          exercise('Supino reto com barra', 3, 8, 12, 90),
          exercise('Puxada frontal', 3, 8, 12, 90),
          exercise('Desenvolvimento com halteres sentado', 2, 8, 12, 90),
          exercise('Remada baixa na polia', 3, 10, 12, 90),
          exercise('Crucifixo na polia', 2, 12, 15, 60),
          exercise('Elevação lateral com halteres', 2, 12, 15, 60),
          exercise('Rosca direta com barra', 2, 10, 12, 60),
          exercise('Tríceps na polia com corda', 2, 10, 15, 60),
        ],
      },
      {
        name: 'Inferior',
        exercises: [
          exercise('Agachamento goblin', 3, 8, 12, 90),
          exercise('Leg press 45 graus', 3, 10, 12, 90),
          exercise('Levantamento terra romeno', 3, 8, 10, 90),
          exercise('Mesa flexora', 2, 10, 15, 60),
          exercise('Elevação pélvica com barra', 2, 10, 12, 60),
          exercise('Panturrilha em pé na máquina', 3, 12, 15, 60),
          exercise('Panturrilha sentado', 2, 12, 15, 60),
          exercise('Prancha', 2, 30, 45, 45),
        ],
      },
    ],
  },
  {
    id: 'template-abc-intermediario',
    name: 'ABC Hipertrofia',
    description:
      'Três sessões com 6 a 8 exercícios e 3 a 4 séries por exercício. O dia A segue o padrão de 3 exercícios de peito e 3 de tríceps; o volume semanal fica na faixa de 10 a 14 séries por grupo principal.',
    level: TRAINING_EXPERIENCE.INTERMEDIATE,
    goal: 'HYPERTROPHY',
    splitType: 'ABC',
    days: [
      {
        name: 'Peito e tríceps',
        exercises: [
          exercise('Supino reto com barra', 4, 6, 10, 120),
          exercise('Supino inclinado com halteres', 3, 8, 12, 90),
          exercise('Crucifixo na polia', 3, 12, 15, 60),
          exercise('Tríceps na polia com corda', 3, 10, 15, 60),
          exercise('Tríceps testa com barra', 3, 8, 12, 90),
          exercise('Tríceps na polia baixa', 3, 12, 15, 45),
        ],
      },
      {
        name: 'Costas e bíceps',
        exercises: [
          exercise('Puxada frontal', 4, 8, 12, 90),
          exercise('Remada curvada', 4, 6, 10, 120),
          exercise('Remada baixa na polia', 3, 10, 12, 90),
          exercise('Pullover na polia', 3, 12, 15, 60),
          exercise('Rosca direta com barra', 3, 8, 12, 60),
          exercise('Rosca alternada com halteres', 3, 10, 12, 60),
          exercise('Rosca martelo', 3, 12, 15, 45),
        ],
      },
      {
        name: 'Pernas e ombros',
        exercises: [
          exercise('Agachamento livre com barra', 4, 6, 10, 120),
          exercise('Leg press 45 graus', 3, 8, 12, 120),
          exercise('Levantamento terra romeno', 3, 8, 10, 120),
          exercise('Cadeira extensora', 3, 12, 15, 60),
          exercise('Mesa flexora', 3, 10, 15, 60),
          exercise('Desenvolvimento com halteres sentado', 3, 8, 12, 90),
          exercise('Elevação lateral com halteres', 3, 12, 15, 60),
          exercise('Panturrilha em pé na máquina', 3, 12, 15, 60),
        ],
      },
    ],
  },
  {
    id: 'template-upper-lower-intermediario',
    name: 'Upper / Lower Intermediário',
    description:
      'Quatro sessões alternando força (4 a 6 repetições) e hipertrofia (8 a 12), com 6 a 7 exercícios por dia e progressão de carga semanal nos compostos.',
    level: TRAINING_EXPERIENCE.INTERMEDIATE,
    goal: 'STRENGTH',
    splitType: 'UPPER_LOWER',
    days: [
      {
        name: 'Superior (força)',
        exercises: [
          exercise('Supino reto com barra', 4, 4, 6, 180),
          exercise('Remada curvada', 4, 4, 6, 180),
          exercise('Desenvolvimento com barra em pé', 3, 6, 8, 120),
          exercise('Puxada frontal', 3, 8, 10, 90),
          exercise('Rosca direta com barra', 3, 8, 10, 90),
          exercise('Tríceps testa com barra', 3, 8, 10, 90),
          exercise('Face pull na polia', 2, 12, 15, 60),
        ],
      },
      {
        name: 'Inferior (força)',
        exercises: [
          exercise('Agachamento livre com barra', 4, 4, 6, 180),
          exercise('Levantamento terra romeno', 4, 5, 8, 150),
          exercise('Leg press 45 graus', 3, 8, 10, 120),
          exercise('Mesa flexora', 3, 10, 12, 90),
          exercise('Panturrilha em pé na máquina', 3, 10, 15, 60),
          exercise('Prancha', 3, 45, 60, 60),
          exercise('Abdominal na máquina', 2, 12, 15, 45),
        ],
      },
      {
        name: 'Superior (hipertrofia)',
        exercises: [
          exercise('Supino inclinado com halteres', 4, 8, 12, 90),
          exercise('Puxada frontal com pegada aberta', 4, 8, 12, 90),
          exercise('Remada baixa na polia', 3, 10, 12, 90),
          exercise('Crucifixo na polia', 3, 12, 15, 60),
          exercise('Elevação lateral com halteres', 3, 12, 15, 60),
          exercise('Rosca alternada com halteres', 3, 10, 12, 60),
          exercise('Tríceps na polia com corda', 3, 10, 15, 60),
        ],
      },
      {
        name: 'Inferior (hipertrofia)',
        exercises: [
          exercise('Leg press 45 graus', 4, 10, 12, 90),
          exercise('Levantamento terra romeno', 3, 8, 10, 90),
          exercise('Cadeira extensora', 3, 12, 15, 60),
          exercise('Mesa flexora', 3, 12, 15, 60),
          exercise('Elevação pélvica com barra', 3, 10, 12, 60),
          exercise('Panturrilha sentado', 3, 12, 15, 60),
          exercise('Abdominal com haltere', 3, 12, 15, 45),
        ],
      },
    ],
  },
  {
    id: 'template-ppl-intermediario',
    name: 'PPL Clássico',
    description:
      'Push, pull e legs em três dias, com 7 exercícios por sessão e 3 a 4 séries por exercício. Cada grupo é treinado uma vez por semana; use como base para 8 a 12 semanas.',
    level: TRAINING_EXPERIENCE.INTERMEDIATE,
    goal: 'HYPERTROPHY',
    splitType: 'PPL',
    days: [
      {
        name: 'Push',
        exercises: [
          exercise('Supino reto com barra', 4, 6, 10, 120),
          exercise('Supino inclinado com halteres', 3, 8, 12, 90),
          exercise('Desenvolvimento com halteres sentado', 3, 8, 12, 90),
          exercise('Crucifixo na polia', 3, 12, 15, 60),
          exercise('Elevação lateral com halteres', 3, 12, 15, 60),
          exercise('Tríceps na polia com corda', 3, 10, 15, 60),
          exercise('Tríceps testa com barra', 3, 8, 12, 90),
        ],
      },
      {
        name: 'Pull',
        exercises: [
          exercise('Puxada frontal', 4, 6, 10, 120),
          exercise('Remada curvada', 4, 6, 10, 120),
          exercise('Remada baixa na polia', 3, 10, 12, 90),
          exercise('Pullover na polia', 3, 12, 15, 60),
          exercise('Rosca direta com barra', 3, 8, 12, 60),
          exercise('Rosca alternada com halteres', 3, 10, 12, 60),
          exercise('Face pull na polia', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Legs',
        exercises: [
          exercise('Agachamento livre com barra', 4, 6, 10, 120),
          exercise('Levantamento terra romeno', 4, 8, 10, 120),
          exercise('Leg press 45 graus', 3, 10, 12, 120),
          exercise('Cadeira extensora', 3, 12, 15, 60),
          exercise('Mesa flexora', 3, 10, 15, 60),
          exercise('Panturrilha em pé na máquina', 4, 12, 15, 60),
          exercise('Abdominal na máquina', 3, 12, 15, 45),
        ],
      },
    ],
  },
  {
    id: 'template-phul-avancado',
    name: 'PHUL Avançado',
    description:
      'Ciclo de força e hipertrofia para quem já treina há mais de dois anos: 3 a 5 repetições nos dias de força, 8 a 15 nos de hipertrofia, 7 exercícios por sessão e progressão semanal.',
    level: TRAINING_EXPERIENCE.ADVANCED,
    goal: 'STRENGTH',
    splitType: 'PHUL',
    days: [
      {
        name: 'Superior (força)',
        exercises: [
          exercise('Supino reto com barra', 5, 3, 5, 180),
          exercise('Remada curvada', 5, 3, 5, 180),
          exercise('Desenvolvimento com barra em pé', 4, 5, 8, 150),
          exercise('Puxada frontal', 3, 6, 10, 120),
          exercise('Rosca direta com barra', 3, 6, 10, 90),
          exercise('Tríceps testa com barra', 3, 6, 10, 90),
          exercise('Face pull na polia', 3, 10, 15, 60),
        ],
      },
      {
        name: 'Inferior (força)',
        exercises: [
          exercise('Agachamento livre com barra', 5, 3, 5, 180),
          exercise('Levantamento terra romeno', 4, 5, 8, 180),
          exercise('Leg press 45 graus', 4, 8, 10, 120),
          exercise('Mesa flexora', 3, 8, 12, 90),
          exercise('Panturrilha em pé na máquina', 4, 8, 12, 90),
          exercise('Prancha', 3, 45, 60, 60),
          exercise('Abdominal na máquina', 3, 12, 15, 45),
        ],
      },
      {
        name: 'Superior (hipertrofia)',
        exercises: [
          exercise('Supino inclinado com halteres', 4, 8, 12, 90),
          exercise('Remada cavalinha', 4, 8, 12, 90),
          exercise('Supino com halteres', 3, 10, 12, 90),
          exercise('Remada baixa na polia', 3, 10, 12, 90),
          exercise('Elevação lateral com halteres', 4, 12, 15, 60),
          exercise('Rosca alternada com halteres', 3, 10, 12, 60),
          exercise('Tríceps na polia com corda', 3, 10, 15, 60),
        ],
      },
      {
        name: 'Inferior (hipertrofia)',
        exercises: [
          exercise('Leg press 45 graus', 4, 10, 15, 90),
          exercise('Cadeira extensora', 4, 12, 15, 60),
          exercise('Levantamento terra romeno', 3, 8, 12, 90),
          exercise('Mesa flexora', 4, 12, 15, 60),
          exercise('Elevação pélvica com barra', 3, 10, 12, 60),
          exercise('Panturrilha sentado', 4, 12, 20, 60),
          exercise('Abdominal com haltere', 3, 15, 20, 45),
        ],
      },
    ],
  },
  {
    id: 'template-arnold-avancado',
    name: 'Arnold Split',
    description:
      'Peito e costas, ombros e braços, pernas: o clássico de Arnold com 8 exercícios por dia, 3 a 5 séries e trabalho pesado em 6 a 12 repetições. Alto volume para quem já tem base.',
    level: TRAINING_EXPERIENCE.ADVANCED,
    goal: 'HYPERTROPHY',
    splitType: 'ARNOLD_SPLIT',
    days: [
      {
        name: 'Peito e costas',
        exercises: [
          exercise('Supino reto com barra', 4, 6, 10, 120),
          exercise('Supino inclinado com halteres', 4, 8, 12, 90),
          exercise('Crucifixo na polia', 4, 10, 15, 60),
          exercise('Flexão de braço', 3, 12, 20, 60),
          exercise('Puxada frontal', 4, 6, 10, 120),
          exercise('Remada curvada', 4, 6, 10, 120),
          exercise('Remada cavalinha', 4, 8, 12, 90),
          exercise('Pullover na polia', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Ombros e braços',
        exercises: [
          exercise('Desenvolvimento com barra em pé', 4, 6, 10, 120),
          exercise('Elevação lateral com halteres', 4, 12, 15, 60),
          exercise('Elevação lateral na polia', 3, 12, 15, 60),
          exercise('Face pull na polia', 3, 12, 15, 60),
          exercise('Rosca direta com barra', 4, 8, 12, 60),
          exercise('Rosca inclineada com haltere', 3, 10, 12, 60),
          exercise('Tríceps testa com barra', 4, 8, 12, 90),
          exercise('Tríceps na polia com corda', 3, 10, 15, 60),
        ],
      },
      {
        name: 'Pernas',
        exercises: [
          exercise('Agachamento livre com barra', 5, 6, 10, 120),
          exercise('Leg press 45 graus', 4, 8, 12, 120),
          exercise('Levantamento terra romeno', 4, 8, 12, 120),
          exercise('Cadeira extensora', 3, 12, 15, 60),
          exercise('Mesa flexora', 4, 10, 15, 60),
          exercise('Elevação pélvica com barra', 3, 10, 12, 60),
          exercise('Panturrilha em pé na máquina', 4, 12, 15, 60),
          exercise('Abdominal na máquina', 3, 12, 15, 45),
        ],
      },
    ],
  },
  {
    id: 'template-ppl6-avancado',
    name: 'PPL 6 Dias — Volume',
    description:
      'Push, pull e legs repetidos na semana, com duas ênfases por padrão e 6 a 7 exercícios por sessão. Volume alto: exige sono, alimentação e recuperação em dia.',
    level: TRAINING_EXPERIENCE.ADVANCED,
    goal: 'HYPERTROPHY',
    splitType: 'PPL',
    days: [
      {
        name: 'Push A',
        exercises: [
          exercise('Supino reto com barra', 4, 6, 10, 120),
          exercise('Supino inclinado com halteres', 4, 8, 12, 90),
          exercise('Crucifixo na polia', 3, 12, 15, 60),
          exercise('Desenvolvimento com halteres sentado', 3, 8, 12, 90),
          exercise('Elevação lateral com halteres', 4, 12, 15, 60),
          exercise('Tríceps na polia com corda', 3, 10, 15, 60),
          exercise('Tríceps testa com barra', 3, 8, 12, 90),
        ],
      },
      {
        name: 'Pull A',
        exercises: [
          exercise('Puxada frontal', 4, 6, 10, 120),
          exercise('Remada curvada', 3, 6, 10, 120),
          exercise('Remada baixa na polia', 3, 10, 12, 90),
          exercise('Pullover na polia', 3, 12, 15, 60),
          exercise('Rosca direta com barra', 3, 8, 12, 60),
          exercise('Face pull na polia', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Legs A',
        exercises: [
          exercise('Agachamento livre com barra', 4, 6, 10, 120),
          exercise('Leg press 45 graus', 4, 8, 12, 120),
          exercise('Cadeira extensora', 3, 12, 15, 60),
          exercise('Levantamento terra romeno', 3, 8, 10, 120),
          exercise('Mesa flexora', 3, 10, 15, 60),
          exercise('Panturrilha em pé na máquina', 4, 12, 15, 60),
          exercise('Abdominal na máquina', 3, 12, 15, 45),
        ],
      },
      {
        name: 'Push B',
        exercises: [
          exercise('Desenvolvimento com barra em pé', 4, 6, 10, 120),
          exercise('Supino inclinado com barra', 4, 8, 12, 90),
          exercise('Supino com halteres', 3, 8, 12, 90),
          exercise('Elevação lateral na polia', 4, 12, 15, 60),
          exercise('Elevação frontal com haltere', 3, 12, 15, 60),
          exercise('Tríceps testa com barra', 3, 8, 12, 90),
          exercise('Tríceps na polia baixa', 3, 10, 15, 45),
        ],
      },
      {
        name: 'Pull B',
        exercises: [
          exercise('Remada cavalinha', 4, 6, 10, 120),
          exercise('Remada unilateral', 3, 8, 12, 90),
          exercise('Puxada frontal com pegada aberta', 3, 8, 12, 90),
          exercise('Rosca alternada com halteres', 3, 10, 12, 60),
          exercise('Rosca martelo', 3, 10, 12, 60),
          exercise('Face pull na polia', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Legs B',
        exercises: [
          exercise('Levantamento terra romeno', 4, 6, 10, 120),
          exercise('Mesa flexora', 4, 10, 15, 60),
          exercise('Agachamento sumô', 3, 8, 12, 120),
          exercise('Leg press 45 graus', 3, 10, 15, 90),
          exercise('Elevação pélvica com barra', 4, 10, 12, 60),
          exercise('Panturrilha sentado', 4, 12, 20, 60),
          exercise('Prancha', 3, 45, 60, 60),
        ],
      },
    ],
  },
  {
    id: 'template-abcde-avancado',
    name: 'ABCDE — Um Grupo por Dia',
    description:
      'Um grupo muscular por dia, com 6 a 8 exercícios e alto volume localizado. Funciona como especialização de curto prazo; alterne com um split de maior frequência a cada 8 a 12 semanas.',
    level: TRAINING_EXPERIENCE.ADVANCED,
    goal: 'HYPERTROPHY',
    splitType: 'ABCDE',
    days: [
      {
        name: 'Peito',
        exercises: [
          exercise('Supino reto com barra', 4, 6, 10, 120),
          exercise('Supino inclinado com halteres', 4, 8, 12, 90),
          exercise('Supino com halteres', 3, 8, 12, 90),
          exercise('Crucifixo com halteres', 4, 12, 15, 60),
          exercise('Peck deck', 3, 12, 15, 60),
          exercise('Flexão de braço', 3, 12, 20, 60),
        ],
      },
      {
        name: 'Costas',
        exercises: [
          exercise('Puxada frontal', 4, 6, 10, 120),
          exercise('Remada curvada', 4, 6, 10, 120),
          exercise('Remada cavalinha', 4, 8, 12, 90),
          exercise('Remada unilateral', 3, 10, 12, 90),
          exercise('Pullover na polia', 3, 12, 15, 60),
          exercise('Flexão invertida', 3, 12, 20, 60),
        ],
      },
      {
        name: 'Pernas',
        exercises: [
          exercise('Agachamento livre com barra', 4, 6, 10, 120),
          exercise('Leg press 45 graus', 4, 8, 12, 120),
          exercise('Levantamento terra romeno', 4, 8, 12, 120),
          exercise('Cadeira extensora', 3, 12, 15, 60),
          exercise('Mesa flexora', 3, 10, 15, 60),
          exercise('Elevação pélvica com barra', 3, 10, 12, 60),
          exercise('Panturrilha em pé na máquina', 4, 12, 15, 60),
          exercise('Panturrilha sentado', 3, 12, 20, 60),
        ],
      },
      {
        name: 'Ombros',
        exercises: [
          exercise('Desenvolvimento com barra em pé', 4, 6, 10, 120),
          exercise('Desenvolvimento com halteres sentado', 3, 8, 12, 90),
          exercise('Elevação lateral com halteres', 4, 12, 15, 60),
          exercise('Elevação lateral na polia', 3, 12, 15, 60),
          exercise('Elevação frontal com haltere', 3, 12, 15, 60),
          exercise('Face pull na polia', 4, 12, 15, 60),
          exercise('Elevação de escápula com barra', 3, 12, 15, 60),
        ],
      },
      {
        name: 'Braços',
        exercises: [
          exercise('Rosca direta com barra', 4, 8, 12, 60),
          exercise('Rosca alternada com halteres', 3, 10, 12, 60),
          exercise('Rosca inclineada com haltere', 3, 10, 12, 60),
          exercise('Rosca martelo', 3, 10, 12, 60),
          exercise('Tríceps na polia com corda', 4, 10, 15, 60),
          exercise('Tríceps testa com barra', 3, 8, 12, 90),
          exercise('Tríceps na polia baixa', 3, 12, 15, 45),
          exercise('Coice na polia', 3, 12, 15, 45),
        ],
      },
    ],
  },
];

/** Normalized form used to compare catalogue names (case and accents). */
export function normalizeExerciseName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/** Templates of a level, or every template when the filter is `ALL`. */
export function filterProgramTemplates(
  level: ProgramLevelFilter
): ProgramTemplate[] {
  return level === 'ALL'
    ? PROGRAM_TEMPLATES
    : PROGRAM_TEMPLATES.filter((template) => template.level === level);
}

export function findProgramTemplate(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((template) => template.id === id);
}

/** Resolves one template exercise against the catalogue, exact name first. */
export function resolveTemplateExercise(
  name: string,
  catalogue: Exercise[]
): Exercise | null {
  const normalizedName = normalizeExerciseName(name);
  const exact = catalogue.find(
    (exercise) => normalizeExerciseName(exercise.name) === normalizedName
  );
  if (exact) {
    return exact;
  }

  const aliases = (EXERCISE_ALIASES[name] ?? []).map(normalizeExerciseName);
  if (aliases.length === 0) {
    return null;
  }
  return (
    catalogue.find((exercise) =>
      aliases.includes(normalizeExerciseName(exercise.name))
    ) ?? null
  );
}

export type ResolvedTemplateExercise = {
  template: TemplateExercise;
  exercise: Exercise;
};

export type ResolvedTemplateDay = {
  name: string;
  exercises: ResolvedTemplateExercise[];
  /** Names that were not found in the catalogue. */
  missing: string[];
};

/**
 * Resolves every exercise of a template day.
 *
 * Missing entries are reported instead of silently dropped, so the details
 * screen can block the copy and explain what is unavailable.
 */
export function resolveTemplateDay(
  day: TemplateDay,
  catalogue: Exercise[]
): ResolvedTemplateDay {
  const exercises: ResolvedTemplateExercise[] = [];
  const missing: string[] = [];

  day.exercises.forEach((template) => {
    const exercise = resolveTemplateExercise(template.name, catalogue);
    if (exercise) {
      exercises.push({ template, exercise });
    } else {
      missing.push(template.name);
    }
  });

  return { name: day.name, exercises, missing };
}

export type TemplateProgramInput = {
  input: CreateProgramInput;
  /** Exercise names of the template that are not in the catalogue. */
  missing: string[];
};

/**
 * Builds the `POST /programs` payload of a template copy.
 *
 * Only identifiers of exercises already present in the catalogue are sent: the
 * app never invents an exercise id (SPEC RF-003).
 */
export function buildTemplateProgramInput(
  template: ProgramTemplate,
  catalogue: Exercise[]
): TemplateProgramInput {
  const days = template.days.map((day) => resolveTemplateDay(day, catalogue));
  const missing = days.flatMap((day) => day.missing);

  return {
    input: {
      name: template.name,
      description: template.description,
      goal: template.goal,
      splitType: template.splitType,
      days: days.map((day) => ({
        name: day.name,
        exercises: day.exercises.map(({ template: exerciseTemplate, exercise }) => ({
          exerciseId: exercise.id,
          targetSets: exerciseTemplate.targetSets,
          targetRepsMin: exerciseTemplate.targetRepsMin,
          targetRepsMax: exerciseTemplate.targetRepsMax,
          restSeconds: exerciseTemplate.restSeconds,
        })),
      })),
    },
    missing,
  };
}
