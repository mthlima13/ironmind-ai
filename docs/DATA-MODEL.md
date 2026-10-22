# Modelo de Dados — IronMind AI

Referência do modelo relacional. A definição canônica está em
[`SPEC.md`](SPEC.md#10-modelo-de-dados) e a fonte executável é a migração
Flyway `backend/src/main/resources/db/migration/V1__baseline.sql`.

- **SGBD:** PostgreSQL 16
- **Mapeamento:** Spring Data JPA / Hibernate
- **Versionamento:** Flyway (`V1__baseline.sql`, `V2__seed_exercises.sql`)
- **Chave primária:** UUID em todas as tabelas
- **Unidade canônica de peso:** quilograma (`weight_kg`)

---

## 1. Diagrama de relacionamentos

```text
users ──┬──< user_preferences
        ├──< workout_programs ──< program_days ──< program_exercises >── exercises
        ├──< workout_sessions ──< session_exercises ──< exercise_sets
        │                                    │
        │                                    └──> exercises
        ├──< personal_records >── exercises
        ├──< injury_restrictions ──< restriction_exercises >── exercises
        └──< ai_recommendations
```

---

## 2. Tabelas

| Tabela | Propósito | Linhas de referência |
|---|---|---|
| `users` | Conta, papel e timezone | `user_preferences.user_id`, `workout_sessions.user_id` |
| `user_preferences` | Unidades, objetivo, experiência, equipamento | `users.id` |
| `exercises` | Catálogo do sistema + exercícios do usuário | `program_exercises.exercise_id`, `session_exercises.exercise_id` |
| `workout_programs` | Programa de treino do usuário | `workout_programs.user_id` |
| `program_days` | Dia do programa (Push/Pull/Legs, Upper/Lower) | `workout_programs.id` |
| `program_exercises` | Exercício dentro do dia, com alvo de séries/reps | `program_days.id`, `exercises.id` |
| `workout_sessions` | Sessão de treino realizada | `workout_sessions.user_id` |
| `session_exercises` | Exercício realizado dentro da sessão | `workout_sessions.id` |
| `exercise_sets` | Série registrada (carga, reps, RPE, descanso) | `session_exercises.id` |
| `personal_records` | Recordes por usuário/exercício/tipo | `exercise_sets.id` (origem) |
| `injury_restrictions` | Limitações informadas pelo usuário | `injury_restrictions.user_id` |
| `restriction_exercises` | Exercícios a evitar (N:N real) | ambas |
| `ai_recommendations` | Propostas e sugestões geradas, com status | `users.id` |

---

## 3. Regras de integridade

### Identidade e ownership
- Toda tabela de dado do usuário carrega `user_id` **ou** um caminho de FK até ele.
- Toda consulta de recurso privado filtra por owner **na camada de repositório**,
  não apenas no controller.
- Recurso de outro usuário responde `404`, nunca `403`.

### Unicidade

| Constraint | Tabela |
|---|---|
| `email` unique | `users` |
| `user_id` unique | `user_preferences` |
| `(user_id, exercise_id, record_type)` unique | `personal_records` |
| `idempotency_key` unique (parcial, quando não nulo) | `exercise_sets` |
| `(restriction_id, exercise_id)` PK composta | `restriction_exercises` |

### Integridade referencial

| Relação | `ON DELETE` | Motivo |
|---|---|---|
| `program_days.program_id` | `CASCADE` | Excluir programa remove dias |
| `program_exercises.program_day_id` | `CASCADE` | Excluir dia remove exercícios |
| `session_exercises.session_id` | `CASCADE` | Excluir sessão remove exercícios |
| `exercise_sets.session_exercise_id` | `CASCADE` | Excluir exercício remove séries |
| `restriction_exercises.*` | `CASCADE` | Tabela associativa |
| `exercises.created_by_user_id` | `SET NULL` | Exercício global sobrevive ao usuário |
| `workout_sessions.program_id` | `SET NULL` | Sessão histórica sobrevive ao programa |

> **Preservação de histórico:** alterar ou excluir um programa **nunca** altera
> sessões já realizadas. Sessões gravam snapshot dos valores no momento do
> registro.

### Valores e domínios

| Campo | Regra |
|---|---|
| `weight_kg` | `>= 0`, `numeric(6,2)`; `NULL` = peso corporal |
| `repetitions` | `>= 0`, inteiro |
| `perceived_exertion` | `1..10` (RPE), `NULL` permitido |
| `duration_seconds`, `distance_meters` | `>= 0`, `NULL` permitido |
| `program_exercises.target_reps_min/max` | `min <= max` |
| `personal_records.value` | `>= 0`; unidade vem de `record_type` |

### Tempo
- Todas as datas são `timestamptz` em UTC.
- `created_at` / `updated_at` preenchidos pela aplicação.
- `users.timezone` define a apresentação local no app.

---

## 4. Índices

| Tabela | Índice | Uso |
|---|---|---|
| `users` | `email` (unique) | Login |
| `workout_sessions` | `(user_id, started_at DESC)` | Histórico paginado |
| `workout_sessions` | `(user_id, status)` | Sessões em andamento |
| `session_exercises` | `(session_id, position)` | Ordem dos exercícios |
| `exercise_sets` | `(session_exercise_id, set_number)` | Séries de um exercício |
| `exercise_sets` | `idempotency_key` (unique parcial) | Idempotência |
| `personal_records` | `(user_id, exercise_id, record_type)` (unique) | Consulta de recordes |
| `exercises` | `(primary_muscle_group, equipment)` | Filtro do catálogo |
| `exercises` | `(is_system, created_by_user_id)` | Separação catálogo global/pessoal |
| `program_exercises` | `(program_day_id, position)` | Ordem dos exercícios do dia |
| `injury_restrictions` | `(user_id, is_active)` | Restrições ativas |

---

## 5. Enums

| Enum | Valores |
|---|---|
| `user_role` | `USER`, `CREATOR`, `ADMIN` |
| `preferred_units` | `KG`, `LB` |
| `training_experience` | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `training_goal` | `HYPERTROPHY`, `STRENGTH`, `ENDURANCE`, `GENERAL` |
| `movement_type` | `COMPOUND`, `ISOLATION`, `CARDIO`, `ISOMETRIC` |
| `session_status` | `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `ABANDONED` |
| `record_type` | `MAX_WEIGHT`, `MAX_REPS_AT_WEIGHT`, `BEST_ESTIMATED_1RM` |
| `recommendation_type` | `WORKOUT_PROGRAM`, `LOAD_SUGGESTION`, `COACH_REPLY` |
| `recommendation_status` | `PENDING`, `ACCEPTED`, `EDITED`, `REJECTED`, `ERROR` |

---

## 6. Consultas derivadas

Nenhuma destas métricas é persistida como coluna; todas são calculadas no
backend a partir das séries.

| Métrica | Cálculo |
|---|---|
| Volume da série | `weight_kg × repetitions` |
| Volume do exercício | Soma das séries válidas do exercício |
| Volume da sessão | Soma das séries válidas da sessão |
| Volume semanal/mensal | Soma agrupada por período |
| 1RM estimado | Fórmula de Brzycki — **decisão pendente #1** |
| Recorde de carga | Maior `weight_kg` do usuário/exercício |
| Recorde de reps | Maior `repetitions` com `weight_kg` ≥ 0 |
| Recorde de 1RM | Maior 1RM estimado do usuário/exercício |

> **Pendência #5:** definir o tratamento de peso corporal (peso `NULL` → não
> entra no volume), séries sem reps e movimentos isométricos.

---

## 7. Dados sensíveis

`injury_restrictions` (e, na Fase 4, medidas corporais e fotos) contêm dados de
saúde. Requisitos:

- Coleta opcional, com consentimento explícito.
- Acesso restrito ao próprio usuário; administrador com auditoria.
- Finalidade declarada e opção de revogar/excluir.
- Retenção definida e automática.
- Nunca incluir em logs, em prompts de IA sem necessidade, nem em resposta de API
  para terceiros.
