# IronMind AI — Backend

API REST do aplicativo **IronMind AI** (Java 21 · Spring Boot 3.4 · PostgreSQL 16 · Flyway).

A especificação canônica do produto é [`docs/SPEC.md`](../docs/SPEC.md). Este README
descreve **apenas o que existe hoje**: nenhum recurso planejado é apresentado como
implementado.

---

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Como subir o PostgreSQL](#como-subir-o-postgresql)
- [Como rodar localmente](#como-rodar-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como rodar os testes](#como-rodar-os-testes)
- [Documentação da API (Swagger)](#documentação-da-api-swagger)
- [O que está implementado](#o-que-está-implementado)
- [O que está planejado](#o-que-está-planejado)
- [Decisões pendentes que afetam este código](#decisões-pendentes-que-afetam-este-código)
- [Limitações conhecidas](#limitações-conhecidas)
- [Estrutura do código](#estrutura-do-código)

---

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| JDK | 21 | `java -version` |
| Maven | 3.10+ | `mvn -version` |
| Docker | 24+ | apenas para o PostgreSQL e para os testes de integração |
| PostgreSQL | 16 | o Flyway exige 13+ (o `gen_random_uuid()` é nativo a partir do 13) |

---

## Como subir o PostgreSQL

O repositório tem um Compose em [`infra/`](../infra). Se ele ainda não existir, use o
comando direto:

```bash
docker run -d --name ironmind-postgres \
  -e POSTGRES_DB=ironmind \
  -e POSTGRES_USER=ironmind \
  -e POSTGRES_PASSWORD=changeme \
  -p 5432:5432 \
  postgres:16-alpine
```

O banco e o usuário precisam existir **antes** de subir a API: o Flyway cria o schema, mas
não cria o banco.

---

## Como rodar localmente

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Ou, com o artefato empacotado:

```bash
cd backend
mvn clean package -DskipTests
java -jar target/ironmind-backend-0.1.0-SNAPSHOT.jar
```

Na primeira execução o Flyway aplica as migrações `V1__baseline.sql` (13 tabelas),
`V2__seed_exercises.sql` (59 exercícios do catálogo global) e `V3__auth_tokens.sql`
(`refresh_tokens` e `password_reset_tokens`).

| Recurso | URL |
|---|---|
| API | <http://localhost:8080/api/v1> |
| Health | <http://localhost:8080/api/v1/health> |
| Swagger UI | <http://localhost:8080/swagger-ui.html> |
| OpenAPI | <http://localhost:8080/v3/api-docs> |
| Actuator | <http://localhost:8080/actuator/health> |

---

## Variáveis de ambiente

Todas as credenciais são lidas de variáveis de ambiente, com padrão seguro de
desenvolvimento. A referência completa está em [`.env.example`](../.env.example).

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/ironmind` | URL do JDBC |
| `DB_USER` | `ironmind` | usuário do banco |
| `DB_PASSWORD` | `changeme` | senha do banco |
| `DB_POOL_SIZE` | `10` | conexões do HikariCP |
| `JWT_SECRET` | `change-me-32-bytes-minimum` | segredo de assinatura do token |
| `JWT_TTL_SECONDS` | `900` | validade do access token |
| `JWT_REFRESH_TTL_SECONDS` | `2592000` | validade do refresh token |
| `JWT_ISSUER` | `ironmind-ai` | claim `iss` |
| `RATE_LIMIT_LOGIN_REQUESTS` | `10` | tentativas de login por janela e por e-mail |
| `RATE_LIMIT_REGISTER_REQUESTS` | `5` | cadastros por janela e por e-mail |
| `RATE_LIMIT_FORGOT_PASSWORD_REQUESTS` | `5` | recuperações por janela e por e-mail |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | tamanho da janela do limitador |
| `MAIL_PROVIDER` | `logging` | provedor do e-mail de recuperação (`logging` só escreve no log) |
| `CORS_ALLOWED_ORIGINS` | origens locais | origens autorizadas a chamar a API |
| `LLM_API_KEY` | vazio | chave do provedor de IA (Fase 2) |
| `LLM_MODEL` | vazio | modelo usado (Fase 2) |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | base do provedor (Fase 2) |
| `LLM_TIMEOUT_MS` | `15000` | timeout da chamada (Fase 2) |
| `LLM_MAX_OUTPUT_TOKENS` | `2000` | limite de tokens (Fase 2) |
| `LLM_DAILY_QUOTA_PER_USER` | `50` | cota diária por usuário (Fase 2) |
| `SPRING_PROFILES_ACTIVE` | `local` | perfil ativo (`local` ou `test`) |

> **Aviso de segurança:** com o `JWT_SECRET` padrão, a aplicação **sobe** e escreve um aviso
> forte no log. Isso é proposital: o esqueleto precisa compilar e rodar em qualquer máquina.
> Antes de qualquer uso real, gere um segredo aleatório
> (`openssl rand -base64 48`) — o token passa a ser assinado com uma chave que só o
> backend conhece.

---

## Como rodar os testes

```bash
cd backend
mvn test          # unitários + integração
mvn verify        # equivalente, com a verificação do pacote
```

| Suíte | Tipo | Precisa de PostgreSQL |
|---|---|---|
| `VolumeCalculatorTest` | unitário | não |
| `OneRepMaxCalculatorTest` | unitário | não |
| `GlobalExceptionHandlerTest` | unitário (MockMvc) | não |
| `ExerciseServiceTest` | unitário (Mockito) | não |
| `UserServiceTest` | unitário (Mockito) | não |
| `PasswordPolicyTest` | unitário | não |
| `RefreshTokenServiceTest` | unitário (Mockito) | não |
| `PasswordResetServiceTest` | unitário (Mockito) | não |
| `AuthRateLimiterTest` | unitário | não |
| `PersistenceIntegrationTest` | integração (PostgreSQL 16 real) | sim |
| `AuthFlowIntegrationTest` | integração (PostgreSQL 16 real) | sim |
| `UserProfileIntegrationTest` | integração (PostgreSQL 16 real) | sim |

O banco usado pela integração é resolvido pelo `TestDatabase`, nesta ordem:

1. **`IT_JDBC_URL`** — um PostgreSQL já em execução. Usa o usuário
   `IT_JDBC_USER` e a senha `IT_JDBC_PASSWORD`.
2. **Testcontainers** — sobe um PostgreSQL 16 efêmero.

Sem nenhum dos dois, a classe de integração é **pulada automaticamente** e os
testes unitários continuam valendo.

```bash
# com o Postgres do docker-compose já no ar
cd infra && docker compose up -d postgres && cd ..
cd backend
$env:IT_JDBC_URL="jdbc:postgresql://localhost:5432/ironmind"
mvn test
```

> **Por que o modo externo existe.** O Docker Desktop no Windows expõe o engine
> por named pipe, e o `docker-java` não consegue negociar a versão de API do
> Docker 29: a CLI funciona, mas toda chamada de container volta como HTTP 400.
> Nesse ambiente, o Testcontainers cai no "sem Docker" e pula a integração —
> mesmo com o Docker funcionando. O modo externo contorna isso. No CI, onde a API
> do Docker responde normalmente, o caminho padrão (Testcontainers) é o usado.

---

## Documentação da API (Swagger)

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- Contrato OpenAPI: <http://localhost:8080/v3/api-docs>

O `springdoc` publica o contrato a partir do código, então ele não atrasa a documentação.

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
`CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `RATE_LIMITED`, `EMAIL_ALREADY_IN_USE`,
`INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `INVALID_RESET_TOKEN`, `AI_UNAVAILABLE`,
`AI_INVALID_RESPONSE`). O `traceId` volta no header `X-Trace-Id` e correlaciona a requisição
com os logs do servidor. **Stack trace nunca é devolvido ao cliente.**

### Autenticação

```bash
# cadastro (201 Created)
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Souza","email":"ana@example.com","password":"senha1234","timezone":"America/Sao_Paulo"}'

# login (200 OK)
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"senha1234"}'

# renovação (200 OK) — o token anterior é revogado
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

# logout (204 No Content)
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'
```

A resposta de login e de renovação é a do Apêndice A.4 da especificação:

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d3f1a...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "id": "...", "name": "Ana Souza", "email": "ana@example.com", "role": "USER" }
}
```

O `Idempotency-Key` do cadastro devolve **a mesma conta**: a primeira chamada responde `201`,
a repetição responde `200` com o mesmo `user.id` (os tokens são novos, porque o valor do
refresh token só existe em texto puro na resposta original — no banco fica apenas o hash).

A recuperação de acesso responde sempre `202`, exista ou não a conta:

```bash
curl -X POST http://localhost:8080/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com"}'

curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"<token recebido por e-mail>","newPassword":"nova-senha1"}'
```

> O token de recuperação **nunca** volta na resposta HTTP. No ambiente de desenvolvimento ele
> é escrito no log pelo `LoggingRecoveryMailSender`.

### Perfil e preferências

`GET /api/v1/users/me` devolve o perfil **aninhado** do usuário do token — o mesmo formato
consumido pelo aplicativo (`mobile/src/types/user.ts`):

```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer <token>"
```

```json
{
  "user": { "id": "...", "name": "Ana Souza", "email": "ana@example.com", "role": "USER" },
  "preferences": {
    "preferredUnits": "KG",
    "trainingExperience": "INTERMEDIATE",
    "goal": "HYPERTROPHY",
    "availableEquipment": ["Barra", "Halteres"],
    "trainingDays": 4,
    "privacySettings": { "publicProfile": false, "showRecords": true, "allowSharing": false }
  },
  "timezone": "America/Sao_Paulo"
}
```

`PATCH /api/v1/users/me` atualiza o perfil. A atualização é **parcial e mesclada**: o campo
omitido mantém o valor atual, e as preferências são mescladas campo a campo.

```bash
curl -X PATCH http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Souza","preferences":{"goal":"HYPERTROPHY","trainingDays":4}}'
```

| Regra | Comportamento |
|---|---|
| Identidade | O dono vem **sempre** do token. `id`, `userId` e `user` no corpo são ignorados. |
| E-mail e papel | Não são alteráveis por este endpoint. |
| Mesclagem | Campo omitido mantém o valor atual; `preferences` mescla campo a campo. |
| `privacySettings` | As três flags (`publicProfile`, `showRecords`, `allowSharing`) sempre voltam resolvidas, com os padrões `false`, `true` e `false`. Um `jsonb` malformado é saneado, não quebra a resposta. |
| `availableEquipment` | Lista de textos. Um valor que não é lista é recusado com `422` no campo `preferences.availableEquipment`. |
| `trainingDays` | Inteiro de 1 a 7 (a API valida antes do `CHECK` do banco). |
| `name` | De 2 a 120 caracteres. |
| `timezone` | Identificador IANA válido, como `America/Sao_Paulo`. |

### Paginação

`GET /api/v1/exercises?page=0&size=20&sort=name,asc` — o envelope é o do Apêndice A.2
(`content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`) e o tamanho máximo de
página é 100.

### Idempotência

Operações que criam registro aceitam o header `Idempotency-Key`:

```bash
curl -X POST http://localhost:8080/api/v1/exercises \
  -H "Authorization: Bearer <token>" \
  -H "Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90" \
  -H "Content-Type: application/json" \
  -d '{"name":"Supino com elástico","primaryMuscleGroup":"Peito","equipment":"Elástico","movementType":"ISOLATION"}'
```

A chave tem escopo por usuário e endpoint. Repetir a requisição com a mesma chave e o mesmo
corpo devolve **o mesmo recurso com HTTP 200** (sem duplicar); repetir com um corpo
diferente devolve **409 `IDEMPOTENCY_KEY_REUSED`**.

---

## O que está implementado

| Área | Situação |
|---|---|
| Schema do banco (13 tabelas, `V1__baseline.sql`) | Implementado |
| Seed do catálogo global (59 exercícios, `V2__seed_exercises.sql`) | Implementado |
| Tabelas de autenticação (`V3__auth_tokens.sql`) | Implementado |
| `GET /api/v1/health` | Implementado |
| Listagem de exercícios com paginação e filtros (grupo muscular, equipamento, busca, `onlyMine`) | Implementado |
| `GET /api/v1/exercises/{id}` | Implementado |
| `POST /api/v1/exercises` (exercício pessoal, com `Idempotency-Key`) | Implementado |
| `PATCH /api/v1/exercises/{id}` (só o próprio exercício) | Implementado |
| `POST /api/v1/auth/register` (conta + preferências + primeira família de refresh) | Implementado |
| `POST /api/v1/auth/login` | Implementado |
| `POST /api/v1/auth/refresh` (rotação com detecção de reuso) | Implementado |
| `POST /api/v1/auth/logout` | Implementado |
| `POST /api/v1/auth/forgot-password` (resposta genérica) | Implementado |
| `POST /api/v1/auth/reset-password` (token de uso único) | Implementado |
| `GET /api/v1/users/me` (perfil e preferências aninhados) | Implementado |
| `PATCH /api/v1/users/me` (atualização parcial e mesclada) | Implementado |
| Hash de senha com Argon2id (parâmetros OWASP) | Implementado |
| Limitador de taxa da autenticação (janela fixa, em memória) | Implementado |
| Contrato de erro único, `traceId` no MDC e no header, handler global | Implementado |
| Cálculo de volume (`carga × repetições`) | Implementado |
| Estimativa de 1RM (fórmula de Brzycki) | Implementado |
| Kernel de segurança: cadeia de filtros, JWT (access e refresh), CORS, OpenAPI | Implementado |
| Modelo de persistência de sessão, série e recorde | Implementado (sem endpoints) |

### Estratégia de token

A decisão está fechada na seção 14.1 da especificação e é a seguinte:

| Credencial | Formato | Validade | Onde é guardada |
|---|---|---|---|
| **Access token** | JWT stateless (`sub`, `email`, `role`, `tokenType=access`) | 15 min | só no cliente |
| **Refresh token** | valor opaco de 256 bits, Base64 URL-safe sem padding | 30 dias | **apenas o SHA-256** em `refresh_tokens.token_hash` |
| **Token de recuperação** | valor opaco de 256 bits | 30 min, uso único | **apenas o SHA-256** em `password_reset_tokens.token_hash` |

- O refresh token **não é um JWT**: é uma credencial, não um documento. O servidor não confia
  em nenhuma claim dele.
- Cada login abre uma **família** de tokens (`refresh_tokens.family_id`). Cada renovação
  revoga o token apresentado e emite um novo **na mesma família**, preenchendo
  `replaced_by_token_id`.
- Apresentar um token **já revogado** é tratado como roubo: a família inteira é revogada e a
  resposta é `401 INVALID_REFRESH_TOKEN`. Token expirado também é revogado no momento do uso.
- Recuperar a senha **revoga todos os refresh tokens** do usuário: a sessão antiga morre.
- A senha é hasheada com **Argon2id** (`m = 19456 KiB`, `t = 2`, `p = 1`, salt de 16 bytes,
  hash de 32 bytes, versão 19). O texto puro nunca é gravado, logado nem devolvido.

### Antienumeração

| Situação | Resposta |
|---|---|
| Login com e-mail inexistente | `401 INVALID_CREDENTIALS` — mesma mensagem e mesmo tempo do e-mail existente |
| Login com senha errada | `401 INVALID_CREDENTIALS` |
| `forgot-password` com e-mail cadastrado | `202` com a mensagem genérica |
| `forgot-password` com e-mail inexistente | `202` com a **mesma** mensagem genérica |

O tempo de resposta do login é igual nos dois casos: quando o e-mail não existe, a API compara
a senha com um hash falso, para não responder mais rápido do que quando a conta existe.

### Endpoints disponíveis

| Método | Endpoint | Acesso |
|---|---|---|
| `GET` | `/api/v1/health` | público |
| `GET` | `/api/v1/exercises` | público |
| `GET` | `/api/v1/exercises/{id}` | público |
| `POST` | `/api/v1/exercises` | exige token |
| `PATCH` | `/api/v1/exercises/{id}` | exige token |
| `POST` | `/api/v1/auth/register` | público |
| `POST` | `/api/v1/auth/login` | público |
| `POST` | `/api/v1/auth/refresh` | público |
| `POST` | `/api/v1/auth/logout` | público (o refresh token é a credencial) |
| `POST` | `/api/v1/auth/forgot-password` | público |
| `POST` | `/api/v1/auth/reset-password` | público |
| `GET` | `/api/v1/users/me` | exige token |
| `PATCH` | `/api/v1/users/me` | exige token |
| `GET` | `/actuator/health`, `/actuator/info` | público |

---

## O que está planejado

Nada abaixo existe no código — é a ordem prevista na seção 17 da especificação.

| Sprint | Entrega |
|---|---|
| Sprint 3 | programas, dias e exercícios; início, pausa e conclusão de sessão; registro e correção de séries com idempotência; histórico paginado |
| Sprint 4 | detecção transacional de recordes; dashboard e gráficos por exercício |
| Sprint 5 | serviço de IA com saída estruturada, validação, rate limiting e fallback |
| Fase 3 | amigos, equipes, conquistas, rankings e moderação |

---

## Decisões pendentes que afetam este código

As decisões 1 e 5 da seção 20 da especificação ainda não foram fechadas, e o código atual
marca cada uma no ponto em que ela aparece. A decisão 2 (estratégia de tokens) está fechada e
implementada — ver a seção [Estratégia de token](#estratégia-de-token).

| Decisão | Onde aparece no código |
|---|---|
| **1 — fórmula de 1RM (Brzycki × Epley) e limites de validade** | `workout/service/OneRepMaxCalculator.java` usa Brzycki como escolha provisória e limita a estimativa a 10 repetições. A escolha precisa ser confirmada antes de expor a métrica. |
| **2 — estratégia de tokens (JWT × sessão, rotação e revogação do refresh)** | **Resolvida.** O access token é um JWT de 15 min e o refresh token é um valor opaco rotativo, com detecção de reuso, guardado apenas como hash (`auth/service/RefreshTokenService.java`). |
| **5 — regras de volume para peso corporal, séries sem carga e movimentos isométricos** | `workout/service/VolumeCalculator.java` conta apenas a carga externa: série sem carga (`weight_kg` nulo) vale zero no volume. |

---

## Limitações conhecidas

- **Rate limiting em memória.** O limitador da autenticação (`auth/ratelimit/AuthRateLimiter.java`)
  usa janela fixa e guarda os contadores no heap da instância: **não sobrevivem a um restart e
  não são compartilhados entre instâncias**. A versão de produção usa **Redis**, onde a janela
  é compartilhada por todas as réplicas da API.
- **Chave do limitador.** A chave é `ip + ":" + e-mail normalizado`, ou seja, o limite vale
  para um par de origem e conta. Um atacante que varre e-mails diferentes a partir da mesma
  origem não é contido por essa chave — a versão de produção precisa somar um limite
  agregado por IP.
- **Idempotência em memória.** As chaves de idempotência ficam no heap da instância: não
  sobrevivem a um restart e não são compartilhadas entre instâncias. Isso vale também para o
  `Idempotency-Key` do cadastro: **um restart entre o cadastro e o reenvio faz o reenvio
  tentar criar uma segunda conta** — o reenvio falha com `409 EMAIL_ALREADY_IN_USE`, porque
  o e-mail é único. Para a Sprint 3, quando o registro de séries entrar, a chave precisa de
  uma tabela durável (o modelo atual só prevê `exercise_sets.idempotency_key`, conforme a
  seção 10.9 da especificação).
- **Provedor de e-mail de desenvolvimento.** `LoggingRecoveryMailSender` **escreve o token de
  recuperação no log** e é o padrão (`app.mail.provider=logging`). Um provedor real de e-mail
  precisa entrar **antes da publicação do aplicativo**, ou o token de recuperação de qualquer
  conta fica exposto a quem tem acesso aos logs.
- **Schema validado no boot.** O `ddl-auto` é `validate`: o Hibernate nunca cria nem
  altera tabela — quem migra é o Flyway — mas a aplicação falha de imediato se uma entity
  ficar fora de sincronia com as migrações. Como o schema usa tipos `ENUM` nativos do
  PostgreSQL e colunas `jsonb`, o mapeamento dessas colunas depende de
  `@JdbcTypeCode(SqlTypes.NAMED_ENUM)` e `@JdbcTypeCode(SqlTypes.JSON)`. As colunas
  `token_hash` são `char(64)` e por isso usam `@JdbcTypeCode(SqlTypes.CHAR)`.
- **`PATCH` não limpa campos.** Campos omitidos no corpo mantêm o valor atual; não há como
  apagar uma descrição.

---

## Estrutura do código

```text
backend/src/main/java/com/ironmind/
├── IronMindApplication.java
├── ai/           # integração com o LLM (planejada — Sprint 5)
├── analytics/    # dashboard e evolução (planejada — Sprint 4)
├── auth/         # autenticação: controller, tokens, senha, e-mail e rate limiting
├── common/       # ApiError, handler global, trace id, exceções, idempotência, config
├── exercise/     # slice vertical do catálogo de exercícios
├── program/      # programas e dias (planejado — Sprint 3)
├── record/       # recordes pessoais (modelo de persistência; detecção na Sprint 4)
├── user/         # perfil e preferências: controller, service, DTOs e persistência
└── workout/      # sessões e séries (modelo de persistência) + volume e 1RM
```

Regras de dependência: `controller → service → repository → entity`. A entity nunca é
serializada direto no JSON, a regra de negócio nunca mora no controller e toda consulta a
dado privado filtra por dono no repositório ou no serviço.
