# API — IronMind AI

Referência rápida da API REST. A especificação completa está em
[`SPEC.md`](SPEC.md#11-api-rest) e a documentação viva é gerada pelo springdoc
em `/swagger-ui.html` com o backend em execução.

- **Base URL:** `http://localhost:8080/api/v1`
- **Formato:** JSON (`application/json`)
- **Identidade:** `X-User-UUID: <uuid-do-titular>` — injetado pelo gateway
- **Banco:** MongoDB 7 em replica set (`rs0`)
- **Fuso das análises:** UTC

> **O que existe hoje.** Backend sem autenticação própria: o gateway autentica o
> usuário e injeta o UUID do titular no header `X-User-UUID`. O serviço usa esse
> UUID para autorizar cada leitura e cada escrita; recurso de outro usuário
> responde sempre `404`. Não existe cadastro, login, perfil nem exclusão de
> conta nesta API — esses fluxos pertencem ao provedor de identidade e ao edge.

| Status | Endpoints |
|---|---|
| **Implementado** | `GET /health`; `GET/POST /exercises`, `GET/PATCH /exercises/{id}`; `GET/POST /programs`, `GET/PUT/DELETE /programs/{id}`; `GET/POST /workout-sessions`, `GET/PATCH /workout-sessions/{id}`, `POST /workout-sessions/{id}/exercises`, `POST /workout-sessions/{id}/sets`, `POST /workout-sessions/{id}/complete`, `PATCH/DELETE /sets/{id}`; `GET /analytics/overview`, `GET /analytics/exercises/{id}`, `GET /records`, `GET/PUT /restrictions`; `POST /ai/workout-proposals`, `/ai/load-suggestions`, `/ai/coach`, `/ai/voice-interpretation`, `/ai/recommendations/{id}/decision` |

---

## 1. Convenções

| Item | Regra |
|---|---|
| Versionamento | Prefixo `/api/v1` na URL. Mudança incompatível → `/api/v2`. |
| Identificadores | UUID v4 em todo recurso. Não sequencial, não adivinhável. |
| Serialização | Entidades de persistência nunca são serializadas. Entrada e saída têm DTO próprio. |
| Validação | Bean Validation na entrada **e** regras de domínio no serviço. |
| Datas | ISO-8601 em UTC, ex. `2026-10-21T19:43:06Z`. Dias de análise são datas UTC. |
| Paginação | Todo endpoint de listagem é paginado. `size` máximo 100. |
| Erros | Formato único em [`ApiError`](#4-formato-de-erro). |
| Idempotência | Header `Idempotency-Key` em escrita que cria registro. |
| Owner | O UUID do titular vem **sempre** do header `X-User-UUID`; nunca do corpo, da query ou da URL. |

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

No registro de série a chave é **durável**: ela fica gravada no documento da
série, sob índice único. Nas demais rotas de criação a chave é guardada em
memória pelo processo que atendeu a primeira chamada.

---

## 2. Identidade

O backend **não autentica** o chamador. Ele confia no header escrito pelo
gateway depois de validar a sessão no provedor de identidade:

```http
GET /api/v1/programs
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
```

| Item | Regra implementada |
|---|---|
| Header | `X-User-UUID` por padrão; o nome é configurável em `app.security.identity.user-uuid-header` (`USER_UUID_HEADER`) |
| Valor | exatamente um UUID canônico (36 caracteres, com hífens) |
| Header ausente, vazio, duplicado, concatenado, malformado ou UUID nulo | rota privada → `401 UNAUTHENTICATED`; rota pública → a requisição segue anônima |
| Identidade sem dados | listagens vazias e `GET` de recurso inexistente → `404`; nunca `401` |
| Recurso de outro usuário | `404 NOT_FOUND` (nunca `403`) |
| Rotas públicas | `GET /health`, `GET /exercises` e `GET /exercises/{id}`; o catálogo do sistema aparece sem header |
| `onlyMine=true` sem header | `401 UNAUTHENTICATED` |

O header só é confiável porque a infraestrutura garante três premissas: remove
qualquer `X-User-UUID` enviado pelo cliente, injeta o UUID validado e mantém a
porta da API fora da internet. Se a API for exposta diretamente, qualquer pessoa
pode escolher a identidade. Ver [`SECURITY.md`](SECURITY.md).

**Fora do escopo desta API:** cadastro, login, senha, refresh token,
recuperação de senha, perfil, preferências, `GET/PATCH /users/me` e exclusão de
conta. Apagar os dados de um titular é responsabilidade do provedor de
identidade e do edge, que também decidem quando o UUID deixa de existir.

---

## 3. Endpoints

### Exercícios

| Método | Endpoint | Identidade | Descrição |
|---|---|---|---|
| `GET` | `/exercises` | — | Listar e filtrar |
| `GET` | `/exercises/{id}` | — | Consultar |
| `POST` | `/exercises` | ✔ | Criar exercício personalizado |
| `PATCH` | `/exercises/{id}` | ✔ | Editar exercício próprio |

Filtros: `q` (nome), `muscleGroup`, `equipment`, `movementType`, `onlyMine`
(exercícios criados pelo titular da requisição), `page`, `size`.

> `POST /exercises` exige o header `Idempotency-Key`. A primeira chamada
> responde `201`; a repetição com a mesma chave e o mesmo corpo responde `200`
> com o **mesmo** recurso; a mesma chave com corpo diferente responde `409`
> `IDEMPOTENCY_KEY_REUSED`.

### Programas

| Método | Endpoint | Identidade | Descrição |
|---|---|---|---|
| `GET` | `/programs` | ✔ | Listar programas do usuário |
| `POST` | `/programs` | ✔ | Criar programa |
| `GET` | `/programs/{id}` | ✔ | Consultar programa com dias e exercícios |
| `PUT` | `/programs/{id}` | ✔ | Atualizar programa |
| `DELETE` | `/programs/{id}` | ✔ | Arquivar programa |

```http
POST /api/v1/programs
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
Content-Type: application/json

{
  "name": "Corpo inteiro A",
  "description": "Um dia de corpo inteiro",
  "goal": "HYPERTROPHY",
  "splitType": "FULL_BODY",
  "days": [
    {
      "name": "Corpo inteiro",
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
  "name": "Corpo inteiro A",
  "description": "Um dia de corpo inteiro",
  "goal": "HYPERTROPHY",
  "splitType": "FULL_BODY",
  "isArchived": false,
  "createdAt": "2026-10-21T19:43:06Z",
  "days": [
    {
      "id": "…",
      "programId": "…",
      "name": "Corpo inteiro",
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
| Dono | vem do header `X-User-UUID`; `userId` no corpo é ignorado |
| Programa alheio | **404**, nunca 403 |
| `POST` e `PUT` | **substituem** a estrutura inteira; a ordem do corpo define `position` |
| `days` | com pelo menos um dia, o total tem que caber na divisão: `AB`=2, `ABC`=3, `ABCD`=4, `ABCDE`=5, `ARNOLD_SPLIT`=3, `UPPER_LOWER`=2 ou 4, `PPL`=3 ou 6, `PHUL`=4, `HYBRID_PPL_UPPER_LOWER`=5, `FULL_BODY`=1 a 6, `CUSTOM`=livre. Sem dias é rascunho. Violação → `422` com `fieldErrors` em `days` |
| `exerciseId` inexistente | `422` com `fieldErrors` apontando `days[0].exercises[1].exerciseId` |
| `targetSets` | >= 1 |
| `targetRepsMin` / `targetRepsMax` | `targetRepsMax` >= `targetRepsMin` |
| `restSeconds` | entre 0 e 600 |
| `DELETE` | **arquiva** (`isArchived = true`); o programa sai da listagem e continua acessível por `GET /programs/{id}` |

### Sessões e séries

| Método | Endpoint | Identidade | Descrição |
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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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

| Método | Endpoint | Identidade | Descrição |
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

| Método | Endpoint | Identidade | Descrição |
|---|---|---|---|
| `POST` | `/ai/workout-proposals` | ✔ | Gerar proposta de treino (idempotente) |
| `POST` | `/ai/load-suggestions` | ✔ | Sugerir carga e repetições (idempotente) |
| `POST` | `/ai/coach` | ✔ | Chat de coaching contextualizado |
| `POST` | `/ai/voice-interpretation` | ✔ | Interpretar transcrição de voz |
| `POST` | `/ai/recommendations/{id}/decision` | ✔ | Registrar aceite, edição ou rejeição |

#### Proposta de treino

```http
POST /api/v1/ai/workout-proposals
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
valem os padrões documentados (3 dias e `GENERAL`) e a IA escolhe a divisão. O
serviço não guarda objetivo nem experiência do usuário: esses dados pertencem à
conta no provedor de identidade.
`splitType` aceita `PPL`, `UPPER_LOWER`, `FULL_BODY`, `AB`, `ABC`, `ABCD`,
`ABCDE`, `ARNOLD_SPLIT`, `PHUL`, `HYBRID_PPL_UPPER_LOWER` e `CUSTOM`. Não existe
modo aleatório: a divisão informada prevalece sobre a sugestão do modelo.

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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
provedor: uma requisição recusada não consome cota.

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
| `UNAUTHENTICATED` | 401 | Header de identidade ausente ou inválido em rota privada |
| `FORBIDDEN` | 403 | Operação proibida (reservado: recurso de outro usuário responde `404`) |
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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
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
