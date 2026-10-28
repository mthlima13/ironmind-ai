# Modelo de Dados — IronMind AI

Referência do modelo persistido no MongoDB. A definição de produto está em
[`SPEC.md`](SPEC.md#10-modelo-de-dados); a fonte executável são as classes
`@Document` em `backend/src/main/java/com/ironmind/<dominio>/entity/` e o seed
`backend/src/main/resources/catalog/exercises.json`.

- **SGBD:** MongoDB 7
- **Topologia:** replica set de 1 nó (`rs0`) — exigida pelas transações de
  múltiplos documentos usadas no recálculo dos recordes
- **Mapeamento:** Spring Data MongoDB (`@Document`, `MongoRepository`)
- **Índices:** declarados nos documentos (`@Indexed`, `@CompoundIndex`) e criados
  no start com `spring.data.mongodb.auto-index-creation: true`
- **Chave primária:** `_id` do tipo UUID em todas as coleções
- **Unidade canônica de peso:** quilograma (`weightKg`)
- **Fuso:** todos os instantes são UTC (`Instant`)

> Não há Flyway, schema SQL nem migração versionada. A evolução do modelo é feita
> no código e nos índices; dados existentes são ajustados por rotina de migração
> quando necessário.

---

## 1. Visão das coleções

```text
exercises ──────────────┐
                        │ exerciseId (referência)
workout_programs        │
   └── program_days     │
         └── program_exercises ──┘

workout_sessions
   └── session_exercises ──> exercises
         └── exercise_sets ──> exercises

personal_records ──> exercises
injury_restrictions   (exerciseIds[])
ai_recommendations
```

Todas as coleções de dado do usuário guardam o UUID do dono em `userId`. As
referências entre documentos são **IDs planos**, sem `@DBRef` e sem embedding: o
serviço carrega os documentos relacionados em lote e monta a resposta.

### O que **não** existe no banco

| Antes (PostgreSQL) | Hoje |
|---|---|
| `users` | Não existe. O UUID do titular chega no header `X-User-UUID`; o serviço não guarda conta, nome, e-mail, papel ou fuso |
| `user_preferences` | Não existe. Unidades e objetivo pertencem à conta no provedor de identidade |
| `refresh_tokens` | Não existe. Sessão e token são do gateway/provedor |
| `password_reset_tokens` | Não existe. Recuperação de acesso é do provedor |
| `restriction_exercises` (N:N) | Substituída pelo array `exerciseIds` em `injury_restrictions` |

---

## 2. Coleções

### 2.1 `exercises`

Catálogo global do sistema e exercícios personalizados.

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | identificador do exercício |
| `name` | string | |
| `description` | string | |
| `primaryMuscleGroup` | string | |
| `secondaryMuscleGroups` | array de string | |
| `equipment` | string | |
| `instructions` | string | |
| `movementType` | enum | `COMPOUND`, `ISOLATION`, `CARDIO`, `ISOMETRIC` |
| `system` | boolean | `true` no catálogo global; `false` no exercício do usuário |
| `createdByUserId` | UUID | `null`/ausente no catálogo global |
| `createdAt` | data | UTC |
| `updatedAt` | data | UTC |

- O seed de 59 exercícios vem de `catalog/exercises.json` e é idempotente por
  nome. O `_id` é determinístico:
  `UUID.nameUUIDFromBytes("ironmind:catalog:" + name)`.
- `system = true` e `createdByUserId` ausente definem exercício global: legível
  por todos, editável por ninguém pela API.
- Exercício personalizado só é visível e editável pelo dono.

### 2.2 `workout_programs`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `userId` | UUID | dono |
| `name` | string | |
| `description` | string | |
| `goal` | enum | `HYPERTROPHY`, `STRENGTH`, `ENDURANCE`, `GENERAL` |
| `splitType` | enum | `PPL`, `UPPER_LOWER`, `FULL_BODY`, `CUSTOM`, `ABCDE`, `ABC`, `ARNOLD_SPLIT`, `PHUL`, `HYBRID_PPL_UPPER_LOWER` |
| `archived` | boolean | arquivar não apaga e não altera sessões |
| `createdAt` | data | UTC |
| `updatedAt` | data | UTC |

### 2.3 `program_days`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `programId` | UUID | referência a `workout_programs` |
| `name` | string | |
| `position` | inteiro | 1-based, ordem do dia |

### 2.4 `program_exercises`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `programId` | UUID | referência ao programa |
| `dayId` | UUID | referência ao dia |
| `exerciseId` | UUID | referência a `exercises` |
| `position` | inteiro | ordem dentro do dia |
| `targetSets` | inteiro | alvo de séries |
| `targetRepsMin` | inteiro | |
| `targetRepsMax` | inteiro | `min <= max` |
| `restSeconds` | inteiro | pode ser nulo |
| `notes` | string | pode ser nulo |

### 2.5 `workout_sessions`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `userId` | UUID | dono |
| `programId` | UUID | nulo em sessão livre |
| `programDayId` | UUID | nulo em sessão livre |
| `startedAt` | data | UTC |
| `completedAt` | data | UTC; nulo enquanto não concluída |
| `status` | enum | `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `ABANDONED` |
| `notes` | string | |
| `createdAt` | data | UTC |

### 2.6 `session_exercises`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `sessionId` | UUID | referência a `workout_sessions` |
| `exerciseId` | UUID | referência a `exercises` |
| `position` | inteiro | ordem dentro da sessão |
| `notes` | string | |
| `targetSets`, `targetRepsMin`, `targetRepsMax`, `restSeconds` | inteiro | cópia da meta do dia, quando a sessão veio de um programa |

### 2.7 `exercise_sets`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `userId` | UUID | dono |
| `sessionId` | UUID | referência à sessão |
| `sessionExerciseId` | UUID | referência ao exercício da sessão |
| `exerciseId` | UUID | referência a `exercises` |
| `setNumber` | inteiro | 1-based, dentro do exercício da sessão |
| `weightKg` | decimal | `>= 0`; ausente = peso corporal |
| `repetitions` | inteiro | `>= 0` |
| `durationSeconds` | inteiro | `>= 0`, opcional |
| `distanceMeters` | inteiro | `>= 0`, opcional |
| `perceivedExertion` | inteiro | RPE 1..10, opcional |
| `restAfterSeconds` | inteiro | `>= 0`, opcional |
| `completedAt` | data | UTC |
| `createdAt` | data | UTC |
| `idempotencyKey` | string | **único e sparse**; ausente quando a requisição não trouxe chave |

> O campo `idempotencyKey` usa `@Field(write = Field.Write.NON_NULL)`: um `null`
> gravado colidiria no índice único com todos os outros documentos sem chave.

### 2.8 `personal_records`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `userId` | UUID | dono |
| `exerciseId` | UUID | referência a `exercises` |
| `recordType` | enum | `MAX_WEIGHT`, `MAX_REPS_AT_WEIGHT`, `BEST_ESTIMATED_1RM` |
| `value` | decimal | `>= 0` |
| `unit` | string | unidade do recorde (`kg`, `reps`, `kg (estimado)`) |
| `sourceSetId` | UUID | série que originou o recorde |
| `achievedAt` | data | UTC |

### 2.9 `injury_restrictions`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `userId` | UUID | dono |
| `bodyRegion` | string | |
| `description` | string | |
| `active` | boolean | revogar a restrição = `false` |
| `exerciseIds` | array de UUID | exercícios a evitar |
| `createdAt` | data | UTC |
| `updatedAt` | data | UTC |

### 2.10 `ai_recommendations`

| Campo | Tipo | Observação |
|---|---|---|
| `_id` | UUID | |
| `userId` | UUID | dono |
| `type` | enum | `WORKOUT_PROGRAM`, `LOAD_SUGGESTION`, `COACH_REPLY` |
| `inputSummary` | string | resumo do pedido, sem dado sensível desnecessário |
| `result` | objeto | saída estruturada validada |
| `modelVersion` | string | modelo + versão usados |
| `status` | enum | `PENDING`, `ACCEPTED`, `EDITED`, `REJECTED`, `ERROR` |
| `createdAt` | data | UTC |
| `acceptedAt` | data | UTC; nulo quando rejeitada ou pendente |

> A conversa completa de coaching e a transcrição de voz não são persistidas.

---

## 3. Regras de integridade

### Identidade e ownership

- Toda coleção de dado privado carrega `userId`, **inclusive** `exercise_sets`,
  para que a consulta não dependa de um join.
- `userId` vem **somente** do header de identidade; nunca do corpo, da query ou
  do path.
- Toda consulta de recurso privado filtra pelo dono no repositório/serviço.
- Recurso de outro usuário responde `404`, nunca `403`.
- Um UUID válido sem dados não é erro: as listas voltam vazias.

### Unicidade e índices

| Coleção | Índice | Uso |
|---|---|---|
| `personal_records` | `{userId: 1, exerciseId: 1, recordType: 1}` **unique** | um recorde por tipo e exercício |
| `exercise_sets` | `idempotencyKey` **unique sparse** | reenvio da mesma série não duplica |
| `workout_sessions` | `{userId: 1, startedAt: -1}` | histórico paginado |
| `workout_sessions` | `{userId: 1, status: 1, completedAt: -1}` | analytics por período |
| `session_exercises` | `{sessionId: 1, position: 1}` | ordem dos exercícios |
| `exercise_sets` | `{userId: 1, exerciseId: 1, completedAt: 1}` | histórico por exercício e recordes |
| `exercise_sets` | `{sessionId: 1, sessionExerciseId: 1, setNumber: 1}` | séries de um exercício |
| `program_exercises` | `{dayId: 1, position: 1}` | ordem dos exercícios do dia |
| `exercises` | `createdByUserId` | separação catálogo global/pessoal |
| `workout_programs` | `userId` | listagem do dono |
| `program_days` | `programId` | dias do programa |
| `program_exercises` | `programId`, `dayId`, `exerciseId` | carga em lote e substituição |
| `workout_sessions` | `sessionId` em `session_exercises` | exercícios da sessão |
| `session_exercises` / `exercise_sets` | `sessionId` | carga em lote das séries |
| `injury_restrictions` | `userId` | restrições do dono |
| `ai_recommendations` | `userId` | recomendações do dono |

> O MongoDB grava o UUID como `BinData` subtipo 3 (UUID padrão). Consulte com
> `UUID("...")` no `mongosh`.

### Consistência entre documentos

- O MongoDB não tem chave estrangeira: a integridade referencial é garantida
  pelo serviço, que valida todo ID antes de gravar.
- A IA **nunca** grava: ela devolve IDs que o backend valida contra o catálogo.
- O recálculo dos recordes roda **na mesma transação** da criação, correção ou
  exclusão da série. Se a transação falhar, a alteração da série é desfeita.
- Arquivar programa ou excluir dia **nunca** altera sessões já realizadas: a
  sessão guarda a própria cópia dos exercícios e das metas.

### Valores e domínios

| Campo | Regra |
|---|---|
| `weightKg` | `>= 0`; ausente = peso corporal |
| `repetitions` | inteiro `>= 0` |
| `perceivedExertion` | 1..10; ausente permitido |
| `durationSeconds`, `distanceMeters`, `restAfterSeconds` | `>= 0`; ausentes permitidos |
| `targetRepsMin/Max` | `min <= max` |
| `personal_records.value` | `>= 0`; unidade vem de `recordType` |

### Tempo

- Todas as datas são `Instant` em UTC.
- `createdAt` / `updatedAt` são preenchidos pela aplicação.
- Não existe fuso do usuário no banco: a apresentação local é responsabilidade
  do cliente. As janelas de analytics (semana atual e anterior) são calculadas
  em **UTC**.
- O MongoDB guarda data com precisão de milissegundos; a API serializa todo
  `Instant` truncado ao milissegundo para que a resposta de uma escrita seja
  idêntica à leitura posterior.

---

## 4. Transações e replica set

`PersonalRecordService.recalculate` abre uma transação que lê as séries, grava
ou atualiza até três recordes e remove os que deixaram de valer. O MongoDB só
suporta transação de múltiplos documentos em replica set, por isso:

- o container `mongo` sobe com `--replSet rs0`;
- `infra/mongo/init-replica-set.js` executa `rs.initiate` uma única vez e espera
  o nó virar primário antes de liberar a API;
- `MongoConfig` declara um `MongoTransactionManager` explícito para os
  `@Transactional` dos serviços;
- o replica set com autenticação exige **keyfile** de autenticação interna, gerado
  no volume na primeira subida e nunca versionado.

---

## 5. Enums

| Enum | Valores |
|---|---|
| `training_goal` | `HYPERTROPHY`, `STRENGTH`, `ENDURANCE`, `GENERAL` |
| `split_type` | `PPL`, `UPPER_LOWER`, `FULL_BODY`, `CUSTOM`, `ABCDE`, `ABC`, `ARNOLD_SPLIT`, `PHUL`, `HYBRID_PPL_UPPER_LOWER` |
| `movement_type` | `COMPOUND`, `ISOLATION`, `CARDIO`, `ISOMETRIC` |
| `session_status` | `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `ABANDONED` |
| `record_type` | `MAX_WEIGHT`, `MAX_REPS_AT_WEIGHT`, `BEST_ESTIMATED_1RM` |
| `recommendation_type` | `WORKOUT_PROGRAM`, `LOAD_SUGGESTION`, `COACH_REPLY` |
| `recommendation_status` | `PENDING`, `ACCEPTED`, `EDITED`, `REJECTED`, `ERROR` |

> `PreferredUnits` e `TrainingExperience` continuam no código como tipos do
> domínio de IA, mas não são persistidos: não há preferências do usuário no
> banco. `TrainingGoal` é usado no programa de treino.

---

## 6. Consultas derivadas

Nenhuma destas métricas é persistida como campo; todas são calculadas no
backend a partir das séries.

| Métrica | Cálculo |
|---|---|
| Volume da série | `weightKg × repetitions` (só carga externa) |
| Volume do exercício | Soma das séries válidas do exercício |
| Volume da sessão | Soma das séries válidas da sessão |
| Volume semanal/mensal | Soma agrupada por período, em UTC |
| 1RM estimado | Brzycki: `weightKg × 36 / (37 − repetitions)`, de 1 a 10 reps |
| Recorde de carga | Maior `weightKg` do usuário/exercício |
| Recorde de reps | Maior `repetitions` com `weightKg` ≥ 0 |
| Recorde de 1RM | Maior 1RM estimado do usuário/exercício |

> **Decisão 5 (resolvida):** peso corporal (`weightKg` ausente), exercício
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

## 8. Exclusão dos dados do titular

O backend não expõe endpoint de exclusão de conta e não guarda o cadastro. A
exclusão é responsabilidade do provedor de identidade / edge:

1. o IdP encerra a conta e invalida a sessão;
2. o edge (ou uma rotina administrativa) remove os documentos com o `userId`
   correspondente nas coleções `workout_programs`, `program_days`,
   `program_exercises`, `workout_sessions`, `session_exercises`, `exercise_sets`,
   `personal_records`, `injury_restrictions` e `ai_recommendations`;
3. exercícios personalizados do titular (`exercises` com `createdByUserId`) também
   são removidos; o catálogo global (`system = true`) permanece.

Não há tombstone nem `identity_subject`: como o serviço não provisiona usuário,
um UUID que volte a aparecer simplesmente vê um histórico vazio. Bloquear a
recriação da conta é papel do IdP.
