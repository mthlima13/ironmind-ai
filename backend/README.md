# IronMind AI — Backend

API REST do aplicativo **IronMind AI** (Java 25 · Spring Boot 3.5 · Spring Data MongoDB ·
identidade delegada ao gateway).

A especificação canônica do produto é [`docs/SPEC.md`](../docs/SPEC.md). Este README
descreve **apenas o que existe hoje**: nenhum recurso planejado é apresentado como
implementado.

> **O serviço não autentica ninguém.** O gateway autentica a sessão e injeta o UUID do
> titular no header `X-User-UUID`. O backend usa esse UUID como dono de cada recurso e
> responde `404` para recurso de outro usuário. Não existe cadastro, login, senha,
> refresh token, perfil nem exclusão de conta aqui — ver
> [`docs/AUTH-INTEGRATION.md`](../docs/AUTH-INTEGRATION.md).

---

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Como subir](#como-subir)
- [Identidade](#identidade)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como rodar os testes](#como-rodar-os-testes)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [Idempotência](#idempotência)
- [Regras de negócio por domínio](#regras-de-negócio-por-domínio)
- [O que está implementado](#o-que-está-implementado)
- [Limitações conhecidas](#limitações-conhecidas)
- [Estrutura do código](#estrutura-do-código)
- [Documentos relacionados](#documentos-relacionados)

---

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| JDK | 25 | `java -version` |
| Maven | 3.10+ | `mvn -version` |
| Docker | 24+ | necessário para o MongoDB em replica set e para a suíte de contrato |

---

## Como subir

### Stack completa (MongoDB + API)

O Compose fica em [`infra/`](../infra) e sobe o MongoDB como replica set de um nó, o
bootstrap do replica set e a API:

```bash
cd infra
docker compose up -d --build
```

| Serviço | Papel |
|---|---|
| `mongo` | MongoDB 7 como `rs0`, com autenticação e keyfile gerado no volume |
| `mongo-init` | Inicia o replica set uma única vez e libera a API só quando o nó é primário |
| `api` | Backend em <http://localhost:8080> |

> **A porta 27017 já está ocupada na sua máquina?** Um MongoDB local costuma escutar
> `127.0.0.1:27017`. Publique o container em outra porta e use a mesma porta no URI:
>
> ```powershell
> $env:MONGO_PORT = "27018"
> docker compose up -d --build
> ```
>
> `MONGO_PORT` afeta apenas o acesso ao banco a partir do host; a API e os testes usam a
> rede interna do compose.

### Backend fora do container

```bash
cd infra && docker compose up -d mongo mongo-init
cd ../backend
mvn spring-boot:run
```

O padrão de `MONGODB_URI` aponta para o replica set local. Se o Mongo estiver em outra
porta:

```powershell
$env:MONGODB_URI = "mongodb://ironmind:changeme@localhost:27018/ironmind?authSource=admin&replicaSet=rs0"
mvn spring-boot:run
```

No Windows, o script evita que o jar em execução trave o `target/`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 start
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 status
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 logs
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 stop
```

| Recurso | URL |
|---|---|
| API | <http://localhost:8080/api/v1> |
| Health | <http://localhost:8080/api/v1/health> |
| Swagger UI | <http://localhost:8080/swagger-ui.html> |
| OpenAPI | <http://localhost:8080/v3/api-docs> |
| Actuator | <http://localhost:8080/actuator/health> |

O seed de 59 exercícios vem de `src/main/resources/catalog/exercises.json` e é
idempotente por nome: subir o serviço duas vezes não duplica o catálogo.

---

## Identidade

O backend **não autentica** o chamador. Ele confia no header escrito pelo gateway depois
de validar a sessão no provedor de identidade:

```bash
curl http://localhost:8080/api/v1/programs \
  -H "X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90"
```

| Situação | Resposta |
|---|---|
| Header ausente, vazio, duplicado, concatenado, `urn:uuid:`, sem hífens, nil ou não-UUID | rota privada → `401 UNAUTHENTICATED`; rota pública → segue anônima |
| UUID em maiúsculas | aceito e normalizado |
| UUID válido sem dados | listas vazias; `GET` de recurso inexistente → `404`; nunca `401` |
| Recurso de outro usuário | `404 NOT_FOUND`, nunca `403` |
| `userId` no corpo da requisição | ignorado; o dono vem do contexto |

Rotas públicas: `GET /api/v1/health`, `GET /api/v1/exercises` e `GET /api/v1/exercises/{id}`.

O nome do header é configurável em `app.security.identity.user-uuid-header`
(`USER_UUID_HEADER`). Nenhum controller, service ou DTO lê o header diretamente: o filtro
central preenche o contexto e `SecurityUtils.requireCurrentUserId()` é a única fonte do
dono.

> **Nunca exponha a porta da API diretamente na internet.** O header só é confiável
> porque o gateway remove o valor enviado pelo cliente, injeta o UUID validado e mantém o
> serviço fora do alcance externo. Ver [`docs/SECURITY.md`](../docs/SECURITY.md).

---

## Variáveis de ambiente

Todas as credenciais são lidas de variáveis de ambiente, com padrão de desenvolvimento.
A referência completa está em [`.env.example`](../.env.example).

| Variável | Padrão | Descrição |
|---|---|---|
| `MONGODB_URI` | `mongodb://ironmind:changeme@localhost:27017/ironmind?authSource=admin&replicaSet=rs0` | URI do MongoDB; precisa apontar para o replica set |
| `USER_UUID_HEADER` | `X-User-UUID` | header de identidade injetado pelo gateway |
| `CORS_ALLOWED_ORIGINS` | origens locais do Expo | origens autorizadas (o header de identidade **não** é liberado) |
| `LLM_PROVIDER` | `mock` | `mock` determinístico e sem custo; `openai` real |
| `LLM_API_KEY`, `LLM_MODEL` | vazio | obrigatórios quando `LLM_PROVIDER=openai` |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | base do provedor |
| `LLM_TIMEOUT_MS` | `15000` | timeout da chamada ao provedor |
| `LLM_MAX_OUTPUT_TOKENS` | `2000` | limite de tokens da resposta |
| `LLM_DAILY_QUOTA_PER_USER` | `50` | chamadas de IA por usuário e por dia |
| `LLM_MAX_RETRIES` | `1` | tentativas extras em falha transitória |
| `LLM_CIRCUIT_FAILURE_THRESHOLD` | `5` | falhas seguidas que abrem o circuito |
| `LLM_CIRCUIT_OPEN_SECONDS` | `30` | tempo com o circuito aberto |
| `AI_RATE_LIMIT_REQUESTS` | `10` | chamadas de IA por usuário e por janela |
| `AI_RATE_LIMIT_WINDOW_SECONDS` | `60` | tamanho da janela do limitador de IA |
| `AI_MAX_DAYS`, `AI_MAX_EXERCISES_PER_DAY`, `AI_MAX_SETS`, `AI_MAX_REPS`, `AI_MAX_REST_SECONDS` | `7`, `10`, `8`, `30`, `600` | limites das respostas estruturadas |
| `AI_DEFAULT_REPS_MIN`, `AI_DEFAULT_REPS_MAX`, `AI_DEFAULT_REST_SECONDS` | `8`, `12`, `90` | valores usados quando repetições ou descanso não são informados |
| `AI_MAX_CATALOG_EXERCISES` | `80` | tamanho máximo do catálogo enviado no contexto |
| `SERVER_PORT` | `8080` | porta HTTP |
| `SPRING_PROFILES_ACTIVE` | `local` | perfil ativo (`local` ou `test`) |
| `LOG_LEVEL` | `INFO` | nível de log (`local` eleva `com.ironmind` para `DEBUG`) |

Variáveis do Compose (não lidas pela aplicação): `MONGO_INITDB_ROOT_USERNAME`,
`MONGO_INITDB_ROOT_PASSWORD`, `MONGO_PORT` e `BACKEND_PORT`.

---

## Como rodar os testes

**Testes unitários (JUnit + Mockito, sem banco):**

```bash
cd backend
mvn clean verify
```

A suíte tem **116 testes em 16 classes**: calculadoras de volume e 1RM, serviços de
exercício, programa, sessão, série, recordes, analytics e IA, filtro de identidade,
validador de proposta, gateway/LLM mock e o handler global de erros.

| Precisa de banco? | Classes |
|---|---|
| Não | `VolumeCalculatorTest`, `OneRepMaxCalculatorTest`, `GlobalExceptionHandlerTest`, `IdentityHeaderFilterTest`, `ExerciseServiceTest`, `ProgramServiceTest`, `WorkoutSessionServiceTest`, `ExerciseSetServiceTest`, `PersonalRecordServiceTest`, `AnalyticsServiceTest`, `AiRateLimiterTest`, `CoachSafetyGuardTest`, `LoadSuggestionServiceTest`, `WorkoutProposalValidatorTest`, `LlmGatewayTest`, `MockLlmProviderTest` |

Não há teste de integração em JUnit e o backend **não usa Testcontainers**.

**Suíte de contrato (Python, contra a API real):**

```bash
cd infra
docker compose up -d --build
docker compose --profile test run --rm tests
```

A suíte em [`tests/integration/`](../tests/integration) tem **100 testes** em 9 módulos e
fala somente com a API pública: identidade e isolamento entre usuários, catálogo,
programas, sessões, séries, recordes, analytics, restrições e IA. Ela não importa código
do backend nem acessa o MongoDB diretamente.

> No PowerShell, `docker compose ... run` pode retornar exit code 1 por causa de avisos em
> stderr (por exemplo, containers órfãos). Confira o resumo do `pytest`.

---

## Documentação da API (Swagger)

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- Contrato OpenAPI: <http://localhost:8080/v3/api-docs>

O `springdoc` publica o contrato a partir do código. Referência textual em
[`docs/API.md`](../docs/API.md).

### Formato de erro

Toda a API responde erros no formato único do Apêndice A da especificação:

```json
{
  "timestamp": "2026-10-21T19:43:06Z",
  "status": 422,
  "error": "Validation Failed",
  "code": "VALIDATION_ERROR",
  "message": "Um ou mais campos inválidos foram enviados.",
  "path": "/api/v1/exercises",
  "traceId": "8f2c1a90-6c1e-4f2b-9a7d-3c5e8b1f0a44",
  "fieldErrors": [{ "field": "name", "message": "O nome do exercício é obrigatório." }]
}
```

`code` é estável (`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`,
`CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `RATE_LIMITED`, `AI_UNAVAILABLE`,
`AI_INVALID_RESPONSE`). O `traceId` volta no header `X-Trace-Id` e correlaciona a
requisição com os logs. **Stack trace nunca é devolvido ao cliente.**

---

## Idempotência

Operações que criam registro aceitam o header `Idempotency-Key`:

```bash
curl -X POST http://localhost:8080/api/v1/exercises \
  -H "X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90" \
  -H "Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90" \
  -H "Content-Type: application/json" \
  -d '{"name":"Supino com elástico","description":"Variação em casa","primaryMuscleGroup":"Peito","equipment":"Elástico","movementType":"ISOLATION"}'
```

| Situação | Resposta |
|---|---|
| Primeira vez com a chave | `201 Created` + recurso criado |
| Repetida com a mesma chave e o mesmo corpo | `200 OK` + **o mesmo** recurso, sem duplicar |
| Repetida com a mesma chave e corpo diferente | `409 Conflict` / `IDEMPOTENCY_KEY_REUSED` |

A chave tem escopo por usuário e endpoint. No registro de série ela é **durável**: o
digest fica gravado no documento da série, sob índice único e sparse. Nas demais rotas de
criação o store é em memória (ver [limitações](#limitações-conhecidas)).

---

## Regras de negócio por domínio

### Exercícios

| Método | Endpoint | Acesso |
|---|---|---|
| `GET` | `/api/v1/exercises` | público (com header, inclui os exercícios do titular) |
| `GET` | `/api/v1/exercises/{id}` | público (com header, inclui os exercícios do titular) |
| `POST` | `/api/v1/exercises` | privado — exige `Idempotency-Key` |
| `PATCH` | `/api/v1/exercises/{id}` | privado — só o exercício do titular |

Filtros: `q`, `muscleGroup`, `equipment`, `movementType`, `onlyMine`, `page`, `size`.
`onlyMine=true` sem header responde `401`.

O catálogo global (`system = true`, sem dono) é legível por todos e não é editável pela
API. Exercício personalizado só é visível e editável pelo dono.

### Programas

| Método | Endpoint | O que faz |
|---|---|---|
| `GET` | `/api/v1/programs` | Lista paginada; arquivados ficam de fora, salvo `includeArchived=true` |
| `GET` | `/api/v1/programs/{id}` | Programa com dias e exercícios |
| `POST` | `/api/v1/programs` | Cria (`Idempotency-Key` opcional) |
| `PUT` | `/api/v1/programs/{id}` | **Substitui** a estrutura inteira |
| `DELETE` | `/api/v1/programs/{id}` | **Arquiva** (`isArchived = true`), não apaga |

```bash
curl -X POST http://localhost:8080/api/v1/programs \
  -H "X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90" \
  -H "Content-Type: application/json" \
  -d '{"name":"Corpo inteiro A","description":"Um dia de corpo inteiro","goal":"HYPERTROPHY","splitType":"FULL_BODY","days":[{"name":"Corpo inteiro","exercises":[{"exerciseId":"<uuid do exercício>","targetSets":3,"targetRepsMin":8,"targetRepsMax":12,"restSeconds":120,"notes":null}]}]}'
```

| Regra | Comportamento |
|---|---|
| Dono | vem do header; `userId` no corpo é ignorado; programa de outro usuário → `404` |
| Estrutura | `POST` e `PUT` gravam dias e exercícios na ordem do corpo, com `position` `1..n`; `PUT` não faz merge |
| Dias × divisão | com dias, o total tem que caber no split: `AB`=2, `ABC`=3, `ABCD`=4, `ABCDE`=5, `ARNOLD_SPLIT`=3, `UPPER_LOWER`=2 ou 4, `PPL`=3 ou 6, `PHUL`=4, `HYBRID_PPL_UPPER_LOWER`=5, `FULL_BODY`=1..6, `CUSTOM`=livre; sem dias é rascunho. Violação → `422` em `days` |
| Catálogo | `exerciseId` inexistente → `422`, com `fieldErrors` apontando `days[0].exercises[1].exerciseId` |
| Validações | nome 1..120; `targetSets` ≥ 1; `targetRepsMin` ≥ 0; `targetRepsMax` ≥ `targetRepsMin`; `restSeconds` 0..600 |
| Paginação | `page` ≥ 0 e `size` 1..100 |

### Sessões e séries

| Endpoint | O que faz |
|---|---|
| `POST /api/v1/workout-sessions` | Inicia a sessão (`201`); copia os exercícios do dia quando `programDayId` é informado |
| `GET /api/v1/workout-sessions` | Histórico paginado do titular, com exercícios e séries embutidos |
| `GET /api/v1/workout-sessions/{id}` | Sessão com exercícios e séries |
| `PATCH /api/v1/workout-sessions/{id}` | Pausa, retoma ou abandona |
| `POST /api/v1/workout-sessions/{id}/exercises` | Adiciona exercício do catálogo (`201`; replay com a mesma chave → `200`) |
| `POST /api/v1/workout-sessions/{id}/sets` | Registra série (`201`) |
| `POST /api/v1/workout-sessions/{id}/complete` | Conclui e preenche `completedAt` (`200`) |
| `PATCH /api/v1/sets/{id}` | Corrige a série, mantendo `id` e `setNumber` |
| `DELETE /api/v1/sets/{id}` | Exclui a série (`204`) |

Estados: `IN_PROGRESS` → `PAUSED` → `IN_PROGRESS` → `COMPLETED` | `ABANDONED`. Concluir e
abandonar não voltam atrás. Sessão `COMPLETED` ou `ABANDONED` é imutável: nova série,
correção, novo exercício ou mudança de estado respondem `409 CONFLICT`.

```bash
curl -X POST http://localhost:8080/api/v1/workout-sessions/<id>/sets \
  -H "X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90" \
  -H "Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90" \
  -H "Content-Type: application/json" \
  -d '{"sessionExerciseId":"…","weightKg":80.0,"repetitions":10,"perceivedExertion":8,"restAfterSeconds":90}'
```

| Regra | Comportamento |
|---|---|
| Dono | sessão, série e exercício da sessão de outro usuário → `404` |
| `setNumber` | atribuído pelo servidor; é a posição dentro do exercício da sessão |
| Carga | `weightKg` é a unidade canônica (kg) e pode ser `null` (peso corporal); `perceivedExertion` 1..10 |
| Idempotência | durável na própria série; mesma chave + mesmo corpo → mesma série com `200` |
| Exercício repetido | o mesmo exercício não entra duas vezes na mesma sessão → `409 CONFLICT` |
| Preenchimento rápido | não há endpoint: o app lê o histórico e usa a última sessão com o exercício |

### Analytics, recordes e restrições

| Método | Endpoint | O que faz |
|---|---|---|
| `GET` | `/api/v1/analytics/overview` | Semana atual (segunda a domingo, UTC) comparada à anterior |
| `GET` | `/api/v1/analytics/exercises/{id}` | Evolução por exercício: melhor carga, melhor 1RM e volume por dia |
| `GET` | `/api/v1/records` | Recordes pessoais paginados |
| `GET` | `/api/v1/restrictions` | Restrições do titular |
| `PUT` | `/api/v1/restrictions` | Substitui as restrições do titular |

Volume soma apenas carga externa (`weightKg × repetitions`); peso corporal, exercício
assistido e movimento isométrico somam zero. O 1RM estimado usa Brzycki
(`carga × 36 / (37 − reps)`) e só existe de 1 a 10 repetições. O recálculo dos recordes é
**transacional**: roda na mesma transação da criação, correção ou exclusão da série.

### IA

> A IA é acessada **somente** pelo backend: a chave do provedor nunca chega ao app. Por
> padrão o backend usa `LLM_PROVIDER=mock`, determinístico e sem custo. A IA **nunca**
> grava no banco e **nunca** inventa identificador de exercício.

| Método | Endpoint | O que faz |
|---|---|---|
| `POST` | `/api/v1/ai/workout-proposals` | Propõe um treino validado (`Idempotency-Key`) |
| `POST` | `/api/v1/ai/load-suggestions` | Sugere carga por regras a partir do histórico (`Idempotency-Key`) |
| `POST` | `/api/v1/ai/coach` | Resposta de coaching com resumo do histórico recente |
| `POST` | `/api/v1/ai/voice-interpretation` | Interpreta a transcrição feita no dispositivo |
| `POST` | `/api/v1/ai/recommendations/{id}/decision` | Registra `ACCEPTED`, `EDITED` ou `REJECTED` |

- O contexto enviado ao modelo é mínimo: padrões de objetivo/experiência/dias, região das
  restrições ativas, catálogo visível, resumo do histórico recente e a divisão escolhida.
  O serviço **não guarda preferências do usuário**; elas pertencem à conta no provedor de
  identidade.
- A divisão informada no pedido prevalece sobre a sugestão do modelo; sem as duas, a
  proposta é `CUSTOM`.
- Limites de dias, exercícios por dia, séries, repetições e descanso são aplicados pelo
  backend. Referências fora do catálogo são descartadas com aviso.
- A sugestão de carga é **calculada por regras** (`INSUFFICIENT_HISTORY`, `REDUCE`,
  `INCREASE`, `KEEP`) e nunca é aplicada automaticamente.
- Coaching e transcrição de voz **não são armazenados**. A proposta grava apenas a
  recomendação e um resumo não sensível do pedido.
- Limite padrão: 10 chamadas por 60 s e 50 por dia, por usuário; a verificação acontece
  antes da chamada ao provedor.

---

## O que está implementado

| Área | Situação |
|---|---|
| Identidade delegada (`X-User-UUID`), autorização por proprietário, `404` para recurso alheio | Implementado |
| Persistência em MongoDB 7, replica set de 1 nó, índices criados no start | Implementado |
| Transações de múltiplos documentos no recálculo dos recordes | Implementado |
| Seed idempotente de 59 exercícios (`catalog/exercises.json`) | Implementado |
| `GET /api/v1/health` | Implementado |
| Catálogo: listagem com paginação e filtros, detalhe, criação e edição pessoal | Implementado |
| Programas: criar, listar, consultar, substituir e arquivar | Implementado |
| Sessões: iniciar, pausar, retomar, abandonar, concluir e histórico paginado | Implementado |
| Séries: registrar, corrigir e excluir, com idempotência durável | Implementado |
| Analytics: visão geral da semana, evolução por exercício, volume e 1RM | Implementado |
| Recordes pessoais transacionais | Implementado |
| Restrições de lesão | Implementado |
| IA: proposta de treino, sugestão de carga, coaching, voz e decisão | Implementado — provedor `mock` por padrão |
| Contrato de erro único, `traceId` no MDC e no header, handler global | Implementado |
| Autenticação local (JWT, senha, refresh, recuperação, perfil, `/users/me`) | **Removida** |

### Endpoints disponíveis

| Método | Endpoint | Acesso |
|---|---|---|
| `GET` | `/api/v1/health` | público |
| `GET` | `/api/v1/exercises`, `/api/v1/exercises/{id}` | público |
| `POST` | `/api/v1/exercises` | header de identidade |
| `PATCH` | `/api/v1/exercises/{id}` | header de identidade |
| `GET/POST` | `/api/v1/programs` | header de identidade |
| `GET/PUT/DELETE` | `/api/v1/programs/{id}` | header de identidade |
| `GET/POST` | `/api/v1/workout-sessions` | header de identidade |
| `GET/PATCH` | `/api/v1/workout-sessions/{id}` | header de identidade |
| `POST` | `/api/v1/workout-sessions/{id}/exercises` | header de identidade |
| `POST` | `/api/v1/workout-sessions/{id}/sets` | header de identidade |
| `POST` | `/api/v1/workout-sessions/{id}/complete` | header de identidade |
| `PATCH/DELETE` | `/api/v1/sets/{id}` | header de identidade |
| `GET` | `/api/v1/analytics/overview` | header de identidade |
| `GET` | `/api/v1/analytics/exercises/{id}` | header de identidade |
| `GET` | `/api/v1/records` | header de identidade |
| `GET/PUT` | `/api/v1/restrictions` | header de identidade |
| `POST` | `/api/v1/ai/*` | header de identidade |
| `GET` | `/actuator/health`, `/actuator/info` | público |

Não existem `/api/v1/auth/*` nem `/api/v1/users/me`: cadastro, login, perfil e exclusão
de conta pertencem ao provedor de identidade.

---

## Limitações conhecidas

- **Idempotência em memória nas demais rotas.** Só o registro de série é durável. Criar
  sessão, adicionar exercício, criar exercício, criar programa e as chamadas de IA usam um
  store no heap: não sobrevive a um restart nem é compartilhado entre instâncias. Por isso
  um restart entre a criação e o reenvio pode criar um segundo registro.
- **Rate limiting de IA em memória.** Janela fixa no heap, com a mesma limitação: não
  sobrevive a restart e não é compartilhado. A borda (gateway) é quem limita o tráfego
  geral, e esse limite não faz parte deste repositório.
- **Provedor de IA padrão é o mock.** `LLM_PROVIDER=mock` responde de forma determinística
  e não acessa a rede. Publicar com IA real exige `LLM_PROVIDER=openai`, `LLM_API_KEY` e
  `LLM_MODEL`.
- **Coaching sem memória de conversa.** Cada chamada recebe só um resumo curto do
  histórico; a conversa não é persistida.
- **Sugestão de carga é baseada em regras.** Não usa LLM e nunca é aplicada
  automaticamente.
- **Sem preferências do usuário no banco.** O contexto de IA usa os padrões documentados
  (objetivo `GENERAL`, experiência `BEGINNER`, 3 dias, sem filtro de equipamento).
- **`Instant` com precisão de milissegundos.** O MongoDB guarda ms; a API trunca todo
  instante ao milissegundo para que a resposta de uma escrita seja idêntica à leitura
  posterior.
- **Sem endpoint de conta.** O serviço não cria, altera nem apaga cadastro; a exclusão dos
  documentos por `userId` é do IdP/edge (ver
  [`docs/DATA-MODEL.md` §8](../docs/DATA-MODEL.md#8-exclusão-dos-dados-do-titular)).
- **Replica set obrigatório.** Transações de múltiplos documentos exigem `rs0`; o MongoDB
  com autenticação exige keyfile, gerado no volume na primeira subida e nunca versionado.
- **Paginação com teto de 100.** `size` acima disso responde `422`.
- **CORS fechado por ambiente.** O perfil `production` exige origens explícitas, sem
  `localhost`, e falha rápido se a configuração estiver insegura.

---

## Estrutura do código

```text
backend/src/main/java/com/ironmind/
├── IronMindApplication.java
├── ai/           # proposta de treino, sugestão de carga, coaching, voz e recomendações
├── analytics/    # dashboard e evolução por exercício
├── common/       # ApiError, handler global, trace id, identidade, idempotência, config
├── exercise/     # slice vertical do catálogo de exercícios
├── program/      # slice vertical dos programas (dias e exercícios)
├── record/       # recordes pessoais e recálculo transacional
├── user/         # apenas restrições de lesão (sem conta, perfil ou preferências)
└── workout/      # sessões, séries, volume e 1RM
```

Regras de dependência: `controller → service → repository → entity`. A entidade nunca é
serializada direto no JSON, a regra de negócio nunca mora no controller e toda consulta a
dado privado filtra pelo dono no repositório ou no serviço.

---

## Documentos relacionados

- [`docs/SPEC.md`](../docs/SPEC.md) — especificação canônica.
- [`docs/API.md`](../docs/API.md) — contrato HTTP e códigos de erro.
- [`docs/DATA-MODEL.md`](../docs/DATA-MODEL.md) — coleções, índices e transações.
- [`docs/AUTH-INTEGRATION.md`](../docs/AUTH-INTEGRATION.md) — contrato da identidade delegada.
- [`docs/SECURITY.md`](../docs/SECURITY.md) — modelo de ameaça e controles.
- [`tests/integration/README.md`](../tests/integration/README.md) — como rodar a suíte de contrato.
