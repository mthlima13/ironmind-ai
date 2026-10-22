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

Na primeira execução o Flyway aplica as migrações `V1__baseline.sql` (13 tabelas) e
`V2__seed_exercises.sql` (59 exercícios do catálogo global).

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
| `PersistenceIntegrationTest` | integração (PostgreSQL 16 real) | sim |

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
`CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `RATE_LIMITED`, `AI_UNAVAILABLE`,
`AI_INVALID_RESPONSE`). O `traceId` volta no header `X-Trace-Id` e correlaciona a requisição
com os logs do servidor. **Stack trace nunca é devolvido ao cliente.**

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
| `GET /api/v1/health` | Implementado |
| Listagem de exercícios com paginação e filtros (grupo muscular, equipamento, busca, `onlyMine`) | Implementado |
| `GET /api/v1/exercises/{id}` | Implementado |
| `POST /api/v1/exercises` (exercício pessoal, com `Idempotency-Key`) | Implementado |
| `PATCH /api/v1/exercises/{id}` (só o próprio exercício) | Implementado |
| Contrato de erro único, `traceId` no MDC e no header, handler global | Implementado |
| Cálculo de volume (`carga × repetições`) | Implementado |
| Estimativa de 1RM (fórmula de Brzycki) | Implementado |
| Kernel de segurança: cadeia de filtros, JWT (access e refresh), CORS, OpenAPI | Implementado |
| Modelo de persistência de usuário, sessão, série e recorde | Implementado (sem endpoints) |

### Endpoints disponíveis

| Método | Endpoint | Acesso |
|---|---|---|
| `GET` | `/api/v1/health` | público |
| `GET` | `/api/v1/exercises` | público |
| `GET` | `/api/v1/exercises/{id}` | público |
| `POST` | `/api/v1/exercises` | exige token |
| `PATCH` | `/api/v1/exercises/{id}` | exige token |
| `GET` | `/actuator/health`, `/actuator/info` | público |

---

## O que está planejado

Nada abaixo existe no código — é a ordem prevista na seção 17 da especificação.

| Sprint | Entrega |
|---|---|
| Sprint 2 | cadastro, login, refresh e recuperação de acesso; perfil e preferências; testes de autorização cruzada |
| Sprint 3 | programas, dias e exercícios; início, pausa e conclusão de sessão; registro e correção de séries com idempotência; histórico paginado |
| Sprint 4 | detecção transacional de recordes; dashboard e gráficos por exercício |
| Sprint 5 | serviço de IA com saída estruturada, validação, rate limiting e fallback |
| Fase 3 | amigos, equipes, conquistas, rankings e moderação |

---

## Decisões pendentes que afetam este código

As decisões 1, 2 e 5 da seção 20 da especificação ainda não foram fechadas. O código atual
marca cada uma no ponto em que ela aparece:

| Decisão | Onde aparece no código |
|---|---|
| **1 — fórmula de 1RM (Brzycki × Epley) e limites de validade** | `workout/service/OneRepMaxCalculator.java` usa Brzycki como escolha provisória e limita a estimativa a 10 repetições. A escolha precisa ser confirmada antes de expor a métrica. |
| **2 — estratégia de tokens (JWT × sessão, rotação e revogação do refresh)** | `auth/security/JwtService.java` implementa o baseline stateless descrito no Apêndice A.4. O refresh token é emitido, mas ainda não há endpoint de renovação nem revogação. |
| **5 — regras de volume para peso corporal, séries sem carga e movimentos isométricos** | `workout/service/VolumeCalculator.java` conta apenas a carga externa: série sem carga (`weight_kg` nulo) vale zero no volume. |

---

## Limitações conhecidas

- **Idempotência em memória.** As chaves de idempotência ficam no heap da instância: não
  sobrevivem a um restart e não são compartilhadas entre instâncias. Para a Sprint 3, quando
  o registro de séries entrar, a chave precisa de uma tabela durável (o modelo atual só
  prevê `exercise_sets.idempotency_key`, conforme a seção 10.9 da especificação).
- **Schema validado no boot.** O `ddl-auto` é `validate`: o Hibernate nunca cria nem
  altera tabela — quem migra é o Flyway — mas a aplicação falha de imediato se uma entity
  ficar fora de sincronia com as migrações. Como o schema usa tipos `ENUM` nativos do
  PostgreSQL e colunas `jsonb`, o mapeamento dessas colunas depende de
  `@JdbcTypeCode(SqlTypes.NAMED_ENUM)` e `@JdbcTypeCode(SqlTypes.JSON)`.
- **Sem fluxo de autenticação.** Não há cadastro, login, refresh nem recuperação de acesso.
  O `JwtService` está pronto para ser usado, mas não há controller de `/api/v1/auth/**`.
- **`PATCH` não limpa campos.** Campos omitidos no corpo mantêm o valor atual; não há como
  apagar uma descrição.
- **Sem rate limiting.** O `RATE_LIMITED` existe no contrato de erro e a exceção de domínio
  está pronta, mas o limitador em si é da Sprint 2 (autenticação) e da Sprint 5 (IA).

---

## Estrutura do código

```text
backend/src/main/java/com/ironmind/
├── IronMindApplication.java
├── ai/           # integração com o LLM (planejada — Sprint 5)
├── analytics/    # dashboard e evolução (planejada — Sprint 4)
├── auth/         # kernel de segurança: JwtService, filtro e SecurityConfig
├── common/       # ApiError, handler global, trace id, exceções, idempotência, config
├── exercise/     # slice vertical do catálogo de exercícios
├── program/      # programas e dias (planejado — Sprint 3)
├── record/       # recordes pessoais (modelo de persistência; detecção na Sprint 4)
├── user/         # conta e preferências (modelo de persistência; endpoints na Sprint 2)
└── workout/      # sessões e séries (modelo de persistência) + volume e 1RM
```

Regras de dependência: `controller → service → repository → entity`. A entity nunca é
serializada direto no JSON, a regra de negócio nunca mora no controller e toda consulta a
dado privado filtra por dono no repositório ou no serviço.
