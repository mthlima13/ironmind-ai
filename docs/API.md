# API — IronMind AI

Referência rápida da API REST. A especificação completa está em
[`SPEC.md`](SPEC.md#11-api-rest) e a documentação viva é gerada pelo springdoc
em `/swagger-ui.html` com o backend em execução.

- **Base URL:** `http://localhost:8080/api/v1`
- **Formato:** JSON (`application/json`)
- **Autenticação:** `Authorization: Bearer <accessToken>`

> **O que existe hoje.** A Sprint 1 entrega apenas o esqueleto: health, o
> catálogo de exercícios e o contrato de erro. Os demais endpoints listados
> abaixo são o **contrato planejado** da Sprint 2 a 5 e ainda **não** estão
> implementados — não conte com eles.

| Status | Endpoints |
|---|---|
| **Implementado** | `GET /health`, `GET /exercises`, `GET /exercises/{id}`, `POST /exercises`, `PATCH /exercises/{id}` |
| Planejado | todo o restante |

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

---

## 3. Endpoints

### Autenticação e usuário

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | — | Criar conta |
| `POST` | `/auth/login` | — | Autenticar |
| `POST` | `/auth/refresh` | refresh | Renovar access token |
| `POST` | `/auth/logout` | ✔ | Revogar refresh token |
| `POST` | `/auth/forgot-password` | — | Iniciar recuperação de acesso |
| `POST` | `/auth/reset-password` | — | Concluir recuperação |
| `GET` | `/users/me` | ✔ | Perfil e preferências |
| `PATCH` | `/users/me` | ✔ | Atualizar perfil e preferências |

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
| `GET` | `/programs/{id}` | ✔ | Consultar com dias e exercícios |
| `PUT` | `/programs/{id}` | ✔ | Atualizar |
| `DELETE` | `/programs/{id}` | ✔ | Arquivar |

### Sessões e séries

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `POST` | `/workout-sessions` | ✔ | Iniciar sessão |
| `GET` | `/workout-sessions` | ✔ | Histórico paginado |
| `GET` | `/workout-sessions/{id}` | ✔ | Consultar sessão |
| `PATCH` | `/workout-sessions/{id}` | ✔ | Pausar / retomar / abandonar |
| `POST` | `/workout-sessions/{id}/exercises` | ✔ | Adicionar exercício |
| `POST` | `/workout-sessions/{id}/sets` | ✔ | Registrar série |
| `PATCH` | `/sets/{id}` | ✔ | Corrigir série |
| `DELETE` | `/sets/{id}` | ✔ | Excluir série e reavaliar recordes |
| `POST` | `/workout-sessions/{id}/complete` | ✔ | Finalizar sessão |

### Analytics, recordes e restrições

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `GET` | `/analytics/overview` | ✔ | Resumo do período |
| `GET` | `/analytics/exercises/{id}` | ✔ | Evolução por exercício |
| `GET` | `/records` | ✔ | Listar recordes pessoais |
| `GET` | `/restrictions` | ✔ | Consultar restrições |
| `PUT` | `/restrictions` | ✔ | Atualizar restrições |

### IA

| Método | Endpoint | Auth | Descrição |
|---|---|---|---|
| `POST` | `/ai/workout-proposals` | ✔ | Gerar proposta de treino |
| `POST` | `/ai/load-suggestions` | ✔ | Sugerir carga e repetições |
| `POST` | `/ai/coach` | ✔ | Chat de coaching contextualizado |
| `POST` | `/ai/voice-interpretation` | ✔ | Interpretar transcrição de voz |

> Endpoints de IA têm rate limiting por usuário, limite diário de custo e
> falha controlada (`503` / `502`) — nunca stack trace.

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
