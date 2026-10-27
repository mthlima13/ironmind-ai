# API — IronMind AI

Referência rápida da API REST. A especificação completa está em
[`SPEC.md`](SPEC.md#11-api-rest) e a documentação viva é gerada pelo springdoc
em `/swagger-ui.html` com o backend em execução.

- **Base URL:** `http://localhost:8080/api/v1`
- **Formato:** JSON (`application/json`)
- **Autenticação:** `Authorization: Bearer <accessToken>`

> **O que existe hoje.** Sprints 1 a 5 entregues: autenticação, perfil e
> preferências, catálogo de exercícios, programas e o fluxo completo de sessão
> (início, pausa/retomada, registro e correção de séries, conclusão), analytics,
> recordes, restrições e a IA inicial (proposta de treino, sugestão de carga,
> coaching e interpretação de voz).
>
> O app continua funcionando sem backend: com
> `EXPO_PUBLIC_USE_MOCK_API=true` todas as telas rodam contra o adaptador de mock
> (`mobile/src/services/mockAdapter.ts`), que segue o mesmo contrato.

| Status | Endpoints |
|---|---|
| **Implementado** | `GET /health`; `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`; `GET/PATCH/DELETE /users/me`; `GET/POST /exercises`, `GET/PATCH /exercises/{id}`; `GET/POST /programs`, `GET/PUT/DELETE /programs/{id}`; `GET/POST /workout-sessions`, `GET/PATCH /workout-sessions/{id}`, `POST /workout-sessions/{id}/exercises`, `POST /workout-sessions/{id}/sets`, `POST /workout-sessions/{id}/complete`, `PATCH/DELETE /sets/{id}`; `GET /analytics/overview`, `GET /analytics/exercises/{id}`, `GET /records`, `GET/PUT /restrictions`; `POST /ai/workout-proposals`, `/ai/load-suggestions`, `/ai/coach`, `/ai/voice-interpretation`, `/ai/recommendations/{id}/decision` |

---

## 1. Convenções

| Item | Regra |
|---|---|
| Versionamento | Prefixo `/api/v1` na URL. Mudança incompatível → `/api/v2`. |
| Identificadores | UUID v4 em todo recurso. Não sequencial, não adivinhável. |
| DTOs | Entidades JPA nunca são serializadas. Entrada e saída têm DTO próprio. |
| Validação | Bean Validation na entrada **e** regras de domínio no serviço. |
| Datas | ISO-8601 com offset UTC, ex. `2026-10-21T19:43:06Z`. |
| Paginação | Todo endpoint de listagem é paginado. `size` máximo 100. |
| Erros | Formato único em [`ApiError`](#4-formato-de-erro). |
| Idempotência | Header `Idempotency-Key` em escrita que cria registro. |
| Owner | `user_id` **nunca** vem do corpo da requisição — vem do token. |

> **Proposta (não implementada):** quando a autenticação passar a ser
> delegada, o owner virá da identidade verificada pelo gateway, nunca do
> corpo, da query ou de um header escrito pelo cliente. O comportamento atual
> continua sendo o do token.

### Paginação

```http
GET /api/v1/workout-sessions?page=0&size=20&sort=startedAt,desc
```

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7,
  "hasNext": true
}
```

Filtros de data usam `from` e `to` em ISO-8601 (`2026-01-01`).

### Idempotência

```http
POST /api/v1/workout-sessions/{id}/sets
Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
```

| Situação | Resposta |
|---|---|
| Primeira vez com a chave | `201 Created` + recurso criado |
| Repetida com a mesma chave e mesmo corpo | `200 OK` + **o mesmo** recurso, sem duplicar |
| Repetida com a mesma chave e corpo diferente | `409 Conflict` / `IDEMPOTENCY_KEY_REUSED` |

---

## 2. Autenticação

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "atleta@exemplo.com",
  "password": "..."
}
```

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d3f1a...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "id": "…", "name": "…", "email": "…", "role": "USER" }
}
```

| Token | Validade | Armazenamento (mobile) |
|---|---|---|
| Access | 15 min (configurável) | memória + `expo-secure-store` |
| Refresh | 30 dias, rotativo | `expo-secure-store` |

Revogação de refresh token no logout invalida a sessão. Tokens nunca são
registrados em log.

### Identidade delegada à infraestrutura — **PROPOSTA**

> **Não implementado.** Hoje toda rota privada exige
> `Authorization: Bearer <accessToken>`. O texto abaixo descreve apenas o
> contrato proposto; ver [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md).

No modelo proposto, o gateway autentica o usuário no provedor de identidade e
injeta a identidade já validada em um header. O backend não lê tokens de
acesso do cliente.

| Item | Proposta |
|---|---|
| Header de identidade | `X-IronMind-User-Id` (configurável; nome a confirmar) |
| Valor | UUID canônico, exatamente um valor |
| Prova de canal | fora do escopo do backend; premissa da infraestrutura (gateway remove o header do cliente e o backend não é exposto) |
| Header ausente, duplicado, concatenado, vazio ou malformado em rota privada | `401 UNAUTHENTICATED` |
| Rotas públicas | header inválido é ignorado; a requisição segue anônima |
| Identidade de outro usuário no recurso | continua `404 NOT_FOUND` |

O backend não autentica o canal: confia no header por premissa. A garantia
depende de a infraestrutura remover o cabeçalho enviado pelo cliente, injetar o
`sub` validado e manter o backend fora da exposição pública. A autorização por
proprietário continua sendo aplicada em toda consulta.

---

## 3. Endpoints

### Autenticação e usuário

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | — | Criar conta |
| `POST` | `/auth/login` | — | Autenticar |
| `POST` | `/auth/refresh` | — | Renovar access token |
| `POST` | `/auth/logout` | — | Revogar refresh token |
| `POST` | `/auth/forgot-password` | — | Iniciar recuperação de acesso |
| `POST` | `/auth/reset-password` | — | Concluir recuperação de acesso |
| `GET` | `/users/me` | ✔ | Perfil e preferências |
| `PATCH` | `/users/me` | ✔ | Atualizar perfil e preferências |
| `DELETE` | `/users/me` | ✔ | Excluir a conta e todos os dados |

#### Cadastro

```http
POST /api/v1/auth/register
Content-Type: application/json
Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90

{
  "name": "Ana Souza",
  "email": "ana@example.com",
  "password": "treino123",
  "timezone": "America/Sao_Paulo"
}
```

`201` com o corpo de `AuthResponse`. Reenviar a mesma requisição com a mesma
`Idempotency-Key` e o mesmo corpo devolve a **mesma conta**, sem criar duas.

**Regras de validação** (as mesmas do aplicativo):

| Campo | Regra |
|---|---|
| `name` | 2 a 120 caracteres |
| `email` | formato válido, máximo 255, normalizado para minúsculas |
| `password` | 8 a 72 caracteres, **pelo menos uma letra e pelo menos um número** |
| `timezone` | opcional, padrão `America/Sao_Paulo` |

E-mail já cadastrado responde `409` com `EMAIL_ALREADY_IN_USE`.

#### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "ana@example.com", "password": "treino123" }
```

`200` com `AuthResponse`. E-mail inexistente e senha errada devolvem **a mesma**
resposta `401` com `INVALID_CREDENTIALS` — a API não revela se o e-mail existe.

#### Renovação

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{ "refreshToken": "c29tZS1yZWZyZXNoLXRva2Vu" }
```

`200` com um **novo** `AuthResponse`: o refresh token é rotativo, o anterior é
revogado. Apresentar um token **já revogado** é tratado como reuso: toda a
família de tokens da sessão é revogada e a resposta é `401`
`INVALID_REFRESH_TOKEN`.

#### Logout

```http
POST /api/v1/auth/logout
Content-Type: application/json

{ "refreshToken": "c29tZS1yZWZyZXNoLXRva2Vu" }
```

`204`. Revoga o token apresentado. É idempotente: revogar um token já revogado
não é erro.

#### Recuperação de acesso

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{ "email": "ana@example.com" }
```

`202` **sempre**, exista ou não a conta:

```json
{ "message": "Se o e-mail estiver cadastrado, você receberá as instruções em instantes." }
```

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{ "token": "token-recebido-por-email", "newPassword": "novasenha123" }
```

`204`. O token é de uso único, vale 30 minutos e **revoga todas as sessões
abertas** do usuário. Token inválido, usado ou expirado responde `401` com
`INVALID_RESET_TOKEN`.

#### Perfil

```http
GET /api/v1/users/me
Authorization: Bearer <accessToken>
```

```json
{
  "user": {
    "id": "…",
    "name": "Ana Souza",
    "email": "ana@example.com",
    "role": "USER"
  },
  "preferences": {
    "preferredUnits": "KG",
    "trainingExperience": "INTERMEDIATE",
    "goal": "HYPERTROPHY",
    "availableEquipment": ["Barra", "Halteres"],
    "trainingDays": 4,
    "privacySettings": {
      "publicProfile": false,
      "showRecords": true,
      "allowSharing": false
    }
  },
  "timezone": "America/Sao_Paulo"
}
```

O perfil é **aninhado**: `user`, `preferences` e `timezone` no mesmo nível.

```http
PATCH /api/v1/users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Ana Souza",
  "timezone": "America/Sao_Paulo",
  "preferences": { "goal": "STRENGTH", "trainingDays": 5 }
}
```

`200` com o mesmo corpo do `GET`. Regras:

| Campo | Regra |
|---|---|
| `name` | 2 a 120 caracteres |
| `timezone` | identificador IANA válido (`America/Sao_Paulo`); inválido devolve `422` |
| `preferences.preferredUnits` | `KG` \| `LB` |
| `preferences.trainingExperience` | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` |
| `preferences.goal` | `HYPERTROPHY` \| `STRENGTH` \| `ENDURANCE` \| `GENERAL` |
| `preferences.availableEquipment` | lista de strings |
| `preferences.trainingDays` | inteiro de 1 a 7 |
| `preferences.privacySettings` | `publicProfile`, `showRecords`, `allowSharing` (booleanos) |

- **Atualização parcial e mesclada.** Um campo omitido mantém o valor atual.
  Enviar só `preferences.goal` não apaga `availableEquipment`.
- **`email` e `role` não são alteráveis** por este endpoint.
- **`privacySettings` é sempre devolvido completo**, com os padrões
  `publicProfile=false`, `showRecords=true`, `allowSharing=false`. Um valor
  malformado no banco é sanitizado, não derruba a resposta.
- O `user_id` **nunca** vem do corpo nem da query: vem do token. Um `userId`
  enviado no corpo é **ignorado**, não rejeitado.
- Recurso de outro usuário responde **404**, nunca 403.

#### Exclusão da conta

```http
DELETE /api/v1/users/me
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "password": "senha-atual"
}
```

`204` sem corpo. A senha é exigida como segunda prova de titularidade: um token
roubado sozinho não apaga a conta. Senha ausente ou incorreta responde `422`
`VALIDATION_ERROR` com `fieldErrors[0].field = "password"` e **não altera nada**.

| Aspecto | Comportamento |
|---|---|
| Tipo de exclusão | **Hard delete** da linha de `users`; a cascata do banco remove preferências, refresh tokens, tokens de recuperação, programas, dias, exercícios de programa, sessões, exercícios de sessão, séries, recordes, restrições e recomendações de IA |
| Exercícios personalizados | Removidos; o catálogo do sistema (`is_system = true`) permanece |
| E-mail | Fica livre para um novo cadastro |
| Access token em circulação | Deixa de autenticar de fato: os endpoints que carregam o usuário respondem `404` até o token expirar (15 min) |
| Refresh token | Apagado em cascata; `POST /auth/refresh` responde `401` `INVALID_REFRESH_TOKEN` |
| Login | Responde `401` `INVALID_CREDENTIALS`, como qualquer conta inexistente |
| Outro usuário | Não é afetado: o titular vem sempre do token, nunca do corpo |

> **Proposta (não implementada):** com a autenticação delegada, a senha deixa
> de existir. A prova de titularidade passa a ser uma **confirmação explícita**
> no corpo e no app, reforçada por **autenticação recente** (step-up, via
> `auth_time` do provedor) quando o gateway enviar esse header. Sem confirmação,
> a resposta é `422`; se o step-up estiver configurado e falhar, a resposta é
> `401 REAUTH_REQUIRED` e o app refaz o login. Um **tombstone** por `subject`
> impede que a próxima requisição recrie a conta. Detalhes e alternativas em
> [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md#7-exclusão-segura-de-conta).

> A operação **não** é reversível e não mantém cópia de arquivo. O app pede
> confirmação em duas etapas e exige a senha antes de chamar este endpoint.

### Exercícios

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `GET` | `/exercises` | — | Listar e filtrar |
| `GET` | `/exercises/{id}` | — | Consultar |
| `POST` | `/exercises` | ✔ | Criar exercício personalizado |
| `PATCH` | `/exercises/{id}` | ✔ | Editar exercício próprio |

Filtros: `q` (nome), `muscleGroup`, `equipment`, `movementType`, `onlyMine`
(exercícios criados pelo usuário autenticado), `page`, `size`.

> `POST /exercises` exige o header `Idempotency-Key`. A primeira chamada
> responde `201`; a repetição com a mesma chave e o mesmo corpo responde `200`
> com o **mesmo** recurso; a mesma chave com corpo diferente responde `409`
> `IDEMPOTENCY_KEY_REUSED`.

### Programas

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `GET` | `/programs` | ✔ | Listar programas do usuário |
| `POST` | `/programs` | ✔ | Criar programa |
| `GET` | `/programs/{id}` | ✔ | Consultar programa com dias e exercícios |
| `PUT` | `/programs/{id}` | ✔ | Atualizar programa |
| `DELETE` | `/programs/{id}` | ✔ | Arquivar programa |

```http
POST /api/v1/programs
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Push / Pull / Legs",
  "description": "Divisão de 3 dias",
  "goal": "HYPERTROPHY",
  "splitType": "PPL",
  "days": [
    {
      "name": "Peito e tríceps",
      "exercises": [
        {
          "exerciseId": "…",
          "targetSets": 3,
          "targetRepsMin": 8,
          "targetRepsMax": 12,
          "restSeconds": 120,
          "notes": null
        }
      ]
    }
  ]
}
```

`201` com o programa completo:

```json
{
  "id": "…",
  "name": "Push / Pull / Legs",
  "description": "Divisão de 3 dias",
  "goal": "HYPERTROPHY",
  "splitType": "PPL",
  "isArchived": false,
  "createdAt": "2026-10-21T19:43:06Z",
  "days": [
    {
      "id": "…",
      "programId": "…",
      "name": "Peito e tríceps",
      "position": 1,
      "exercises": [
        {
          "id": "…",
          "exerciseId": "…",
          "exercise": { "id": "…", "name": "Supino reto com barra", "…": "…" },
          "position": 1,
          "targetSets": 3,
          "targetRepsMin": 8,
          "targetRepsMax": 12,
          "restSeconds": 120,
          "notes": null
        }
      ]
    }
  ]
}
```

Regras:

| Item | Regra |
|---|---|
| Dono | vem do token; `userId` no corpo é ignorado |
| Programa alheio | **404**, nunca 403 |
| `POST` e `PUT` | **substituem** a estrutura inteira; a ordem do corpo define `position` |
| `exerciseId` inexistente | `422` com `fieldErrors` apontando `days[0].exercises[1].exerciseId` |
| `targetSets` | >= 1 |
| `targetRepsMin` / `targetRepsMax` | `targetRepsMax` >= `targetRepsMin` |
| `restSeconds` | entre 0 e 600 |
| `DELETE` | **arquiva** (`isArchived = true`); o programa sai da listagem e continua acessível por `GET /programs/{id}` |

### Sessões e séries

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `POST` | `/workout-sessions` | ✔ | Iniciar sessão |
| `GET` | `/workout-sessions` | ✔ | Histórico paginado |
| `GET` | `/workout-sessions/{id}` | ✔ | Consultar sessão |
| `PATCH` | `/workout-sessions/{id}` | ✔ | Pausar / retomar / abandonar |
| `POST` | `/workout-sessions/{id}/exercises` | ✔ | Adicionar exercício à sessão |
| `POST` | `/workout-sessions/{id}/sets` | ✔ | Registrar série |
| `PATCH` | `/sets/{id}` | ✔ | Corrigir série |
| `DELETE` | `/sets/{id}` | ✔ | Excluir série |
| `POST` | `/workout-sessions/{id}/complete` | ✔ | Finalizar sessão |

```http
POST /api/v1/workout-sessions
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "programId": null, "programDayId": null }
```

`201` com a sessão. `programId` e `programDayId` são opcionais: `null` significa
treino livre. Quando informado, o programa e o dia precisam ser do usuário —
caso contrário, **404**.

A sessão traz os exercícios e as séries embutidos:

```json
{
  "id": "…",
  "programId": null,
  "programDayId": null,
  "startedAt": "2026-10-21T19:43:06Z",
  "completedAt": null,
  "status": "IN_PROGRESS",
  "notes": null,
  "exercises": [
    {
      "id": "…",
      "exerciseId": "…",
      "exercise": { "id": "…", "name": "Supino reto com barra", "…": "…" },
      "position": 1,
      "notes": null,
      "targetSets": 3,
      "targetRepsMin": 8,
      "targetRepsMax": 12,
      "restSeconds": 120,
      "sets": [
        {
          "id": "…",
          "setNumber": 1,
          "weightKg": 80.0,
          "repetitions": 10,
          "durationSeconds": null,
          "distanceMeters": null,
          "perceivedExertion": 8,
          "restAfterSeconds": 90,
          "completedAt": "2026-10-21T19:45:00Z"
        }
      ]
    }
  ]
}
```

**Estados da sessão** (`status`): `IN_PROGRESS` → `PAUSED` → `IN_PROGRESS` →
`COMPLETED` ou `ABANDONED`.

| Transição | Quem dispara |
|---|---|
| `IN_PROGRESS` → `PAUSED` | `PATCH /workout-sessions/{id}` |
| `PAUSED` → `IN_PROGRESS` | `PATCH /workout-sessions/{id}` |
| `IN_PROGRESS`/`PAUSED` → `COMPLETED` | `POST /workout-sessions/{id}/complete` |
| `IN_PROGRESS`/`PAUSED` → `ABANDONED` | `PATCH /workout-sessions/{id}` |

Uma sessão `COMPLETED` ou `ABANDONED` é **imutável**: não aceita novas séries nem
mudanças de estado. Tentar isso devolve `409` `CONFLICT`.

#### Registrar uma série

```http
POST /api/v1/workout-sessions/{id}/sets
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90

{
  "sessionExerciseId": "…",
  "weightKg": 80.0,
  "repetitions": 10,
  "perceivedExertion": 8,
  "restAfterSeconds": 90
}
```

`201` com a série. `weightKg` é a **unidade canônica** (kg) e pode ser `null`
para peso corporal. `perceivedExertion` é o RPE de 1 a 10.

A chave de idempotência segue o contrato do Apêndice A.3: repetir com a mesma
chave e o mesmo corpo devolve **a mesma série** com `200`, sem duplicar; a mesma
chave com corpo diferente devolve `409` `IDEMPOTENCY_KEY_REUSED`.

O `setNumber` é atribuído pelo servidor: é a posição da série dentro do
exercício da sessão. Não vai no corpo.

#### Preenchimento rápido (RF-010)

Não existe endpoint separado: o app usa o **histórico**. A primeira sessão da
listagem que contém o exercício é a última em que ele foi executado, e as
séries dela são a sugestão. O cliente busca `GET /workout-sessions` e escolhe.

#### Corrigir e excluir séries

```http
PATCH /api/v1/sets/{id}
{ "weightKg": 82.5, "repetitions": 8 }
```

`200` com a série corrigida. `DELETE /api/v1/sets/{id}` devolve `204`. A
exclusão ou correção de uma série reavalia os recordes derivados de forma
transacional.


### Analytics, recordes e restrições

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `GET` | `/analytics/overview` | ✔ | Resumo da semana atual (segunda a domingo), com comparação com a semana anterior |
| `GET` | `/analytics/exercises/{id}` | ✔ | Evolução por exercício, agrupada por dia (melhor carga, melhor 1RM estimado Brzycki e volume) |
| `GET` | `/records` | ✔ | Listar recordes pessoais (paginado), recalculados pelo servidor |
| `GET` | `/restrictions` | ✔ | Consultar restrições do usuário |
| `PUT` | `/restrictions` | ✔ | Atualizar restrições do usuário |

### IA

> A IA é acessada **somente** pelo backend: a chave do provedor nunca chega ao
> app. Por padrão o backend usa o provedor `mock` (`LLM_PROVIDER=mock`), que
> responde de forma determinística e não gasta créditos; `LLM_PROVIDER=openai`
> exige `LLM_API_KEY` e `LLM_MODEL` e falha rápido quando faltam.
>
> A IA **nunca** grava no banco e **nunca** inventa identificador de exercício:
> toda resposta é validada pelo backend e nada vira programa sem a revisão do
> usuário.

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `POST` | `/ai/workout-proposals` | ✔ | Gerar proposta de treino (idempotente) |
| `POST` | `/ai/load-suggestions` | ✔ | Sugerir carga e repetições (idempotente) |
| `POST` | `/ai/coach` | ✔ | Chat de coaching contextualizado |
| `POST` | `/ai/voice-interpretation` | ✔ | Interpretar transcrição de voz |
| `POST` | `/ai/recommendations/{id}/decision` | ✔ | Registrar aceite, edição ou rejeição |

#### Proposta de treino

```http
POST /api/v1/ai/workout-proposals
Authorization: Bearer <accessToken>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "prompt": "Treino de hipertrofia para 4 dias",
  "trainingDays": 4,
  "goal": "HYPERTROPHY",
  "splitType": "UPPER_LOWER"
}
```

`trainingDays` (1 a 7), `goal` e `splitType` são opcionais; quando ausentes
valem as preferências do usuário (dias e objetivo) e a IA escolhe a divisão.
`splitType` aceita `PPL`, `UPPER_LOWER`, `FULL_BODY`, `ABCDE`, `ABC`,
`ARNOLD_SPLIT`, `PHUL` e `HYBRID_PPL_UPPER_LOWER`. Não existe modo aleatório: a
divisão informada prevalece sobre a sugestão do modelo.

`200` com a proposta validada:

```json
{
  "recommendationId": "…",
  "status": "PENDING",
  "model": "mock-ironmind-v1",
  "name": "Treino de hipertrofia",
  "goal": "HYPERTROPHY",
  "splitType": "UPPER_LOWER",
  "days": [
    {
      "name": "Dia 1",
      "exercises": [
        {
          "exerciseId": "…",
          "name": "Supino reto com barra",
          "primaryMuscleGroup": "Peito",
          "sets": 3,
          "repsMin": 8,
          "repsMax": 12,
          "restSeconds": 90
        }
      ]
    }
  ],
  "explanation": "…",
  "warnings": [],
  "disclaimer": "Sugestão informativa gerada por IA. Revise antes de salvar."
}
```

Regras:

| Item | Regra |
|---|---|
| Catálogo | só exercícios visíveis ao usuário, já filtrados por restrição ativa e equipamento |
| `splitType` | a divisão do pedido prevalece; sem pedido, vale a sugestão do modelo; sem nenhuma das duas, `CUSTOM` |
| `exerciseId` fora do catálogo | descartado, com aviso em `warnings` |
| Limites | dias, exercícios por dia, séries, repetições e descanso são ajustados pelo backend |
| Dias sem exercício e exercícios repetidos | removidos antes da resposta |
| O que fica gravado | apenas a recomendação (`PENDING`) e um resumo não sensível do pedido; o texto do prompt não é armazenado |
| Salvar | continua sendo `POST /programs`, com o payload revisado pelo usuário |
| Idempotência | mesma chave e mesmo corpo devolvem a mesma recomendação, com o status atual |

#### Sugestão de carga

```http
POST /api/v1/ai/load-suggestions
Authorization: Bearer <accessToken>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "exerciseId": "…",
  "targetRepsMin": 8,
  "targetRepsMax": 12
}
```

`200`:

```json
{
  "recommendationId": "…",
  "status": "PENDING",
  "exerciseId": "…",
  "exerciseName": "Supino reto com barra",
  "sets": [
    { "setNumber": 1, "weightKg": 82.5, "repetitions": 8, "durationSeconds": null, "distanceMeters": null }
  ],
  "rule": "KEEP",
  "confidence": "MEDIUM",
  "explanation": "…",
  "sessionsConsidered": 3,
  "lastPerformedAt": "2026-10-20T18:00:00Z",
  "warnings": [],
  "disclaimer": "…",
  "applied": false
}
```

A sugestão é **calculada por regras** a partir do histórico concluído, nunca
pelo modelo, e jamais é aplicada automaticamente (`applied` é sempre `false`):

| Regra | Quando |
|---|---|
| `INSUFFICIENT_HISTORY` | não há sessão concluída com o exercício; nenhuma carga é sugerida |
| `REDUCE` | a última sessão teve RPE ≥ 9 ou ficou abaixo do mínimo de repetições |
| `INCREASE` | pelo menos 3 sessões, topo da faixa atingido nas 2 últimas e RPE ≤ 8 em todas |
| `KEEP` | nenhuma das anteriores: mantém a carga e as séries da última sessão |

O incremento é de 2,5 kg a partir de 20 kg e de 1 kg abaixo disso. Exercício
inexistente ou de outro usuário responde `404`; exercício bloqueado por
restrição ativa responde `422`.

#### Coaching

```http
POST /api/v1/ai/coach
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "message": "Como estou indo esta semana?" }
```

`200`:

```json
{
  "reply": "…",
  "model": "mock-ironmind-v1",
  "disclaimers": ["Resposta informativa gerada por IA; não substitui a avaliação de um profissional de saúde ou de educação física."]
}
```

O contexto enviado ao modelo é um resumo curto do histórico recente (sessões
concluídas nas últimas quatro semanas), sem texto livre de restrições nem dado
de saúde. A resposta passa por uma verificação de segurança: diagnóstico,
prescrição de tratamento e recomendação de substâncias são substituídos por uma
resposta segura e menção a dor sempre acrescenta a orientação de interromper o
movimento e procurar um profissional. A conversa **não** é armazenada.

#### Interpretação de voz

```http
POST /api/v1/ai/voice-interpretation
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "transcript": "80 kg 10 repetições" }
```

`200`:

```json
{
  "sets": [
    { "setNumber": 1, "weightKg": 80, "repetitions": 10, "durationSeconds": null, "distanceMeters": null }
  ],
  "notes": null,
  "model": "mock-ironmind-v1",
  "warnings": [],
  "disclaimer": "Confira os valores antes de registrar a série."
}
```

O áudio é transcrito **no dispositivo**: o backend recebe apenas texto. A
interpretação só pré-preenche o formulário de série e não é armazenada; o
usuário confirma cada valor antes do registro.

#### Decisão sobre a recomendação

```http
POST /api/v1/ai/recommendations/{id}/decision
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "status": "EDITED", "programId": "…" }
```

| Campo | Regra |
|---|---|
| `status` | `ACCEPTED`, `EDITED` ou `REJECTED` |
| `programId` | opcional; precisa pertencer ao mesmo usuário |

`200`:

```json
{
  "id": "…",
  "status": "EDITED",
  "acceptedAt": "2026-10-22T12:00:00Z",
  "savedProgramId": "…"
}
```

Uma recomendação já revisada responde `409`. Recurso de outro usuário responde
`404`.

#### Erros e limites

| Situação | Resposta |
|---|---|
| Provedor indisponível, timeout ou circuito aberto | `503` `AI_UNAVAILABLE` |
| Resposta do provedor fora do formato esperado | `502` `AI_INVALID_RESPONSE` |
| Limite de chamadas ou cota diária | `429` `RATE_LIMITED`, com `Retry-After` |
| Chave de idempotência reutilizada com outro corpo | `409` `IDEMPOTENCY_KEY_REUSED` |
| Recomendação já revisada | `409` `CONFLICT` |

Por padrão cada usuário pode fazer 10 chamadas de IA por janela de 60 s
(`AI_RATE_LIMIT_REQUESTS` / `AI_RATE_LIMIT_WINDOW_SECONDS`) e 50 por dia
(`LLM_DAILY_QUOTA_PER_USER`). A verificação acontece antes da chamada ao
provedor: uma requisição recusada não gasta token.

---

## 4. Formato de erro

Formato único para toda a API:

```json
{
  "timestamp": "2026-10-21T19:43:06Z",
  "status": 422,
  "error": "Validation Failed",
  "code": "VALIDATION_ERROR",
  "message": "O campo 'weightKg' deve ser maior ou igual a zero.",
  "path": "/api/v1/workout-sessions/{id}/sets",
  "traceId": "8f2c1a90-6c1e-4f2b-9a7d-3c5e8b1f0a44",
  "fieldErrors": [
    { "field": "weightKg", "message": "deve ser maior ou igual a zero" }
  ]
}
```

`code` é estável e serve para tratamento no cliente (i18n). `message` é
legível por humanos e **nunca** inclui stack trace, caminho de arquivo ou nome de
tabela. `traceId` correlaciona a requisição com os logs do servidor.

### Códigos de erro de domínio

| Código | HTTP | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Entrada inválida |
| `UNAUTHENTICATED` | 401 | Token ausente, expirado ou inválido |
| `FORBIDDEN` | 403 | Operação proibida ao papel do usuário |
| `NOT_FOUND` | 404 | Recurso inexistente **ou** pertencente a outro usuário |
| `CONFLICT` | 409 | Estado inconsistente (ex.: finalizar sessão já finalizada) |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Chave repetida com payload diferente |
| `EMAIL_ALREADY_IN_USE` | 409 | E-mail já cadastrado |
| `INVALID_CREDENTIALS` | 401 | E-mail ou senha inválidos |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token expirado, revogado ou reutilizado |
| `INVALID_RESET_TOKEN` | 401 | Token de recuperação inválido, usado ou expirado |
| `REAUTH_REQUIRED` (**proposta**) | 401 | Autenticação recente exigida para operação sensível; não implementado |
| `RATE_LIMITED` | 429 | Limite de requisições excedido |
| `AI_UNAVAILABLE` | 503 | Provedor de IA indisponível ou timeout |
| `AI_INVALID_RESPONSE` | 502 | Resposta da IA fora do esquema |

> Recurso de outro usuário retorna **404**, não 403 — não revele a existência de
> dados que o usuário não pode ver.

---

## 5. Exemplos

### Registrar uma série

```http
POST /api/v1/workout-sessions/{sessionId}/sets
Authorization: Bearer <accessToken>
Content-Type: application/json
Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90

{
  "sessionExerciseId": "e1f2…",
  "weightKg": 80.0,
  "repetitions": 10,
  "perceivedExertion": 8
}
```

```json
{
  "id": "c7d8…",
  "setNumber": 3,
  "weightKg": 80.0,
  "repetitions": 10,
  "perceivedExertion": 8,
  "volume": 800.0,
  "completedAt": "2026-10-21T19:43:06Z",
  "newPersonalRecord": true,
  "recordType": "BEST_ESTIMATED_1RM"
}
```

### Gerar proposta de treino

```http
POST /api/v1/ai/workout-proposals
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "prompt": "Monte uma proposta de treino de costas, foco em hipertrofia, usando os equipamentos disponíveis."
}
```

```json
{
  "id": "r1…",
  "recommendationType": "WORKOUT_PROGRAM",
  "status": "PENDING",
  "result": {
    "name": "Treino de costas",
    "goal": "HYPERTROPHY",
    "days": [
      {
        "name": "Costa",
        "exercises": [
          { "exerciseId": "…", "sets": 3, "repRange": { "min": 8, "max": 12 }, "restSeconds": 120 }
        ]
      }
    ],
    "explanation": "Proposta inicial para revisão do usuário."
  }
}
```

A proposta **não** é persistida como programa. O usuário revisa e confirma; só
então o programa é criado.

---

## 6. OpenAPI

Com o backend em execução:

- UI interativa: <http://localhost:8080/swagger-ui.html>
- JSON: <http://localhost:8080/v3/api-docs>
- YAML: <http://localhost:8080/v3/api-docs.yaml>

O contrato gerado é a referência do cliente mobile — mudanças incompatíveis
exigem atualização dos dois lados no mesmo pull request.
