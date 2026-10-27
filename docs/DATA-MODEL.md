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
        ├──< ai_recommendations
        ├──< refresh_tokens ──< refresh_tokens (replaced_by_token_id)
        └──< password_reset_tokens
```

### Tokens de sessão

| Tabela | O que guarda |
|---|---|
| `refresh_tokens` | O **hash SHA-256** do refresh token opaco, a `family_id` da sessão, a validade, a revogação e o token que o substituiu |
| `password_reset_tokens` | O **hash SHA-256** do token de recuperação, a validade e o instante de uso |

> O valor em texto puro do token **nunca** é gravado. Um vazamento dessas
> tabelas não concede acesso a nenhuma sessão: o atacante teria o hash, que
> não serve para autenticar.

A `family_id` agrupa os tokens de uma mesma sessão de login. É o que permite
detectar reuso: apresentar um token já revogado revoga a família inteira.

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
| `refresh_tokens` | Sessões de login: refresh token opaco, rotativo, com detecção de reuso | `users.id` |
| `password_reset_tokens` | Recuperação de acesso: token de uso único, 30 minutos | `users.id` |

> **Proposta (não implementada):** com a autenticação delegada à
> infraestrutura, o modelo ganharia `users.identity_subject` e a tabela
> `deleted_identities` (tombstone), e `users.email`/`users.password_hash`
> deixariam de ser obrigatórios. Nada disso existe hoje: o schema atual
> continua sendo o descrito acima e na migração `V1__baseline.sql`. Detalhes
> em [§8](#8-identidade-externa--proposta-não-implementado).

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

> Os recordes são derivados das séries e recalculados transacionalmente pelo backend. A unicidade `(user_id, exercise_id, record_type)` cobre `MAX_WEIGHT`, `MAX_REPS_AT_WEIGHT` e `BEST_ESTIMATED_1RM` para este produto. |
| `(restriction_id, exercise_id)` PK composta | `restriction_exercises` |
| `token_hash` unique | `refresh_tokens`, `password_reset_tokens` |

### Integridade referencial

| Relação | `ON DELETE` | Motivo |
|---|---|---|
| `program_days.program_id` | `CASCADE` | Excluir programa remove dias |
| `program_exercises.program_day_id` | `CASCADE` | Excluir dia remove exercícios |
| `session_exercises.session_id` | `CASCADE` | Excluir sessão remove exercícios |
| `exercise_sets.session_exercise_id` | `CASCADE` | Excluir exercício remove séries |
| `restriction_exercises.*` | `CASCADE` | Tabela associativa |
| `exercises.created_by_user_id` | `CASCADE` | Exercício personalizado é apagado com a conta; os globais têm `created_by_user_id = NULL` e permanecem |
| `workout_sessions.program_id` | `SET NULL` | Sessão histórica sobrevive ao programa |
| `*.user_id` (preferências, programas, dias, sessões, séries, recordes, restrições, recomendações, tokens) | `CASCADE` | Excluir a conta (`DELETE /users/me`) apaga todos os dados do titular |

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
| `refresh_tokens` | `token_hash` (unique) | Buscar o token apresentado no login/refresh |
| `refresh_tokens` | `(family_id)` | Revogar a família inteira na detecção de reuso |
| `refresh_tokens` | `(expires_at)` | Limpeza de tokens expirados |
| `password_reset_tokens` | `token_hash` (unique) | Buscar o token de recuperação |
| `password_reset_tokens` | `(expires_at)` | Limpeza de tokens expirados |

> **Proposta (não implementada):** `users.identity_subject` (unique, quando não
> nulo) para resolver o `sub` do provedor em uma consulta; `deleted_identities`
> com PK em `subject` para o tombstone; e remoção dos índices de
> `refresh_tokens`/`password_reset_tokens` apenas depois que essas tabelas
> saírem. Nenhum índice novo foi criado.

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
| Volume da série | `weight_kg × repetitions` (só carga externa) |
| Volume do exercício | Soma das séries válidas do exercício |
| Volume da sessão | Soma das séries válidas da sessão |
| Volume semanal/mensal | Soma agrupada por período |
| 1RM estimado | Brzycki: `weight_kg × 36 / (37 − repetitions)`, de 1 a 10 reps |
| Recorde de carga | Maior `weight_kg` do usuário/exercício |
| Recorde de reps | Maior `repetitions` com `weight_kg` ≥ 0 |
| Recorde de 1RM | Maior 1RM estimado do usuário/exercício |

> **Decisão 5 (resolvida):** peso corporal (`weight_kg NULL`), exercício
> assistido e movimento isométrico ou por tempo somam **zero** ao volume. O
> número exibido representa apenas a carga externa movimentada.

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

---

## 8. Identidade externa — **PROPOSTA (não implementado)**

> Esta seção descreve uma mudança **futura**, condicionada à aprovação do
> contrato em [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md). Não existe migração,
> coluna, tabela ou índice novo no banco; a migração `V1__baseline.sql`
> permanece imutável e nenhuma `V3` foi escrita.

### 8.1 `users.identity_subject` — **PROPOSTA**

| Coluna | Tipo proposto | Regra |
|---|---|---|
| `identity_subject` | `text` | identificador opaco do provedor de identidade; `NULL` para contas ainda não vinculadas |

- **Único quando não nulo** (`UNIQUE` parcial), para impedir que dois usuários
  internos representem o mesmo titular.
- Não é chave primária: `users.id` continua sendo o UUID interno referenciado
  pelas FKs existentes. O vínculo `subject → users.id` é resolvido uma vez por
  requisição e não reescreve nenhuma FK.
- O formato do `sub` **não está confirmado** (é tratado como string opaca até a
  decisão da infraestrutura). Não presumir que seja UUID nem que seja igual a
  `users.id`.
- Não guardar token, e-mail, nome ou qualquer PII do provedor nesta coluna.

### 8.2 `deleted_identities` (tombstone) — **PROPOSTA**

| Coluna | Tipo proposto | Regra |
|---|---|---|
| `subject` | `text` | PK; identificador externo já excluído |
| `deleted_at` | `timestamptz` | instante da exclusão, em UTC |

- **Sem PII:** nem e-mail, nem nome, nem hash de senha, nem token.
- Serve para duas coisas: idempotência da exclusão e bloqueio de
  re-provisionamento automático (ver
  [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md#7-exclusão-segura-de-conta)).
- Retenção e período de carência são **PENDENTES** (produto + jurídico). Um
  tombstone apagado cedo demais permite que a próxima requisição recrie a
  conta; apagado tarde demais conflita com o direito à eliminação.
- Alternativa em MongoDB: coleção `deleted_identities` com `_id = subject`.
  A escolha acompanha a decisão de persistência, ainda pendente.

### 8.3 Campos que deixariam de ser obrigatórios — **PROPOSTA**

| Coluna atual | Hoje | Proposta |
|---|---|---|
| `users.email` | `NOT NULL`, unique | `NULL` permitido; unique apenas quando não nulo |
| `users.password_hash` | `NOT NULL` | removida quando `/auth/*` sair |
| `refresh_tokens` | tabela ativa | removida junto com o refresh local |
| `password_reset_tokens` | tabela ativa | removida junto com a recuperação local |

Enquanto o modo `header` não estiver ativo, **nada muda**: o schema atual
continua válido e as restrições continuam como estão.

### 8.4 Transição — **PENDENTE**

1. A coluna e o tombstone exigiriam uma nova migração Flyway (`V3`), escrita
   apenas depois da aprovação; migrações publicadas não são editadas.
2. O preenchimento de `identity_subject` para contas existentes depende da
   decisão de vínculo (por e-mail verificado, migração assistida ou conta
   nova). Nenhuma dessas opções foi escolhida.
3. A remoção de `password_hash` e das tabelas de token é a **última** etapa,
   depois que o gateway estiver em produção e o modo `header` validado.
4. A modelagem continua compatível com a futura migração para MongoDB: o
   vínculo é um campo do documento `users` e o tombstone é uma coleção
   separada. A migração não está autorizada.

