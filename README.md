# IronMind AI

> **Treine com inteligência. Evolua com dados.**

Aplicativo mobile **Android** de treinamento físico que combina registro rápido
de séries, planejamento de programas, análise de desempenho e recomendações
assistidas por inteligência artificial.

> **Plataforma:** o primeiro lançamento é **exclusivamente Android**. O iOS está
> planejado para uma fase posterior — o código segue agnóstico de plataforma.
> Detalhes em [`docs/SPEC.md`](docs/SPEC.md#15-plataforma-de-lançamento-android-first).

**Documento canônico do projeto:** [`docs/SPEC.md`](docs/SPEC.md)

---

## O problema

Registrar um treino exige planilha, app genérico ou anotações soltas — e no
momento do treino o atrito é o que faz o usuário desistir. Em seguida, os dados
ficam presos em um serviço sem significado: o usuário não sabe se está progredindo,
se a carga deveria subir, e se o treino faz sentido para o objetivo dele.

O IronMind AI resolve isso em duas frentes:

1. **Registro confiável e rápido** — poucos toques durante o treino, histórico
   imutável, volume, 1RM estimado e recordes calculados de forma consistente.
2. **Decisão assistida** — o histórico real do usuário alimenta recomendações
   explicáveis, que ele revisa e aceita ou rejeita. A IA propõe; o backend
   valida; o usuário decide.

---

## Status do projeto

> **Estágio atual: fundação (Sprint 1).** O repositório contém o esqueleto
> completo e executável do backend e do aplicativo. Nenhuma funcionalidade de
> produto está pronta para o usuário final.

| Área | Situação |
|---|---|
| Schema do banco (13 tabelas, migrações Flyway, seed de 59 exercícios) | Implementado |
| Backend: health, slice de exercícios, kernel de segurança JWT | Implementado |
| Contrato de erro da API, trace ID, tratamento global de exceções | Implementado |
| Cálculo de volume e estimativa de 1RM | Implementado |
| App Android: 5 abas, autenticação, dashboard, catálogo, editor de programa, registro de série, histórico, perfil | Implementado (com dados mockados) |
| Adaptações Android: back do sistema, edge-to-edge, permissões em runtime, safe area | Implementado |
| Testes | 23 no backend + 36 no mobile, todos passando |
| API real consumida pelo app | Planejado — o app usa um adaptador de mock |
| Cadastro e login reais no backend | Planejado — Sprint 2 |
| Programas, sessões e séries na API | Planejado — Sprint 3 |
| Analytics, recordes e dashboard no backend | Planejado — Sprint 4 |
| Integração com IA | Planejado — Sprint 5 |
| Recursos sociais e gamificação | Planejado — Fase 3 |
| Exclusão de conta in-app | Planejado — Sprint 6 (exigência do Google Play) |

**Não descreva este projeto como se os recursos planejados já existissem.**
Consulte [`docs/SPEC.md`](docs/SPEC.md) para a visão completa e honesta.

---

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Mobile | React Native · Expo · TypeScript · Expo Router · TanStack Query · Zustand · Expo SQLite · expo-secure-store — **alvo: Android** |
| Backend | Java 21 · Spring Boot 3 · Spring Security · Spring Data JPA · Bean Validation |
| API | REST `/api/v1` · OpenAPI 3 (springdoc) · JWT com access + refresh token |
| Dados | PostgreSQL 16 · Flyway · Testcontainers |
| Infra | Docker · Docker Compose · GitHub Actions |
| IA | API de LLM consumida **exclusivamente pelo backend**, com saída estruturada e validação |

---

## Como executar

### Pré-requisitos

- Java 21 (JDK)
- Maven 3.10+
- Node.js 24+ e npm 11+
- Docker Desktop (para PostgreSQL e para os testes de integração)

### 1. Infraestrutura

```bash
cd infra
docker compose up -d postgres     # so o banco
docker compose --profile app up -d # banco + redis + backend
```

Copie as variáveis de ambiente antes:

```bash
cp .env.example .env
```

### 2. Backend

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

No Windows, use o script, que evita o jar ficar travado no `target/` e impede
que o `mvn clean` falhe:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 start
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 status
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 logs
powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 stop
```

- API: <http://localhost:8080/api/v1>
- **Swagger UI: <http://localhost:8080/swagger-ui.html>**
- Health: <http://localhost:8080/api/v1/health>
- OpenAPI: <http://localhost:8080/v3/api-docs>

> O Postgres precisa estar no ar antes: `cd infra && docker compose up -d postgres`.
> O Flyway cria o schema, mas não cria o banco.

### 3. Aplicativo mobile

```bash
cd mobile
npm install
npx expo start
```

No terminal do Metro: `a` abre no Android (emulador ou aparelho via ADB),
`r` recarrega, `j` abre o debugger.

O app **funciona sem backend**: usa um adaptador de mock embutido que cumpre os
mesmos contratos da API (paginação, formato de erro, idempotência). Para falar
com a API real, ajuste o `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_USE_MOCK_API=false
```

> No emulador Android o host é `10.0.2.2`; num aparelho físico, use o IP da LAN
> da máquina (ex.: `http://192.168.1.27:8080/api/v1`) — `localhost` no celular
> aponta para o próprio aparelho.

Build de release em **AAB** (o formato exigido pelo Google Play):

```bash
cd mobile
npx expo prebuild --platform android
cd android && ./gradlew bundleRelease
```

> A chave de upload do Play Console e o keystore **nunca** entram no repositório.
> Ver [`docs/SPEC.md`](docs/SPEC.md#166-distribuição).

### 4. Testes

```bash
# backend — 23 testes
cd backend && mvn test

# mobile — 36 testes
cd mobile && npx tsc --noEmit && npx jest
```

Os testes de integração do backend precisam de um PostgreSQL. Ele é resolvido
nesta ordem: a variável `IT_JDBC_URL` (Postgres já em execução) ou um container
Testcontainers. Sem nenhum dos dois, a integração é pulada e os testes unitários
continuam valendo.

```bash
# com o Postgres do compose no ar
$env:IT_JDBC_URL="jdbc:postgresql://localhost:5432/ironmind"
cd backend && mvn test
```

> No Windows com Docker Desktop, o Testcontainers não consegue negociar a API do
> Docker 29 e a integração seria pulada mesmo com o Docker no ar — por isso o
> modo externo. No CI, onde a API do Docker responde normalmente, o caminho
> padrão (Testcontainers) é o usado.

---

## Arquitetura

```text
Aplicativo React Native / Expo
            |
            | HTTPS / JSON
            v
API REST — Spring Boot  (/api/v1)
            |
            +---- Auth & autorização
            +---- Usuários, preferências e restrições
            +---- Exercícios
            +---- Programas e dias
            +---- Sessões, exercícios e séries
            +---- Analytics e recordes
            +---- Serviço de IA  ---> API externa de LLM
            +---- Comunidade (Fase 3)
            |
            v
        PostgreSQL  (+ Flyway)
```

Princípios que a arquitetura não negocia:

- Regras de negócio moram no serviço, nunca no controller.
- O cliente **nunca** é fonte de verdade para cálculo: volume, 1RM e recordes
  são calculados no backend.
- O `user_id` vem do token, nunca do corpo da requisição.
- Cálculos determinísticos nunca passam pelo modelo de linguagem.
- A IA nunca inventa referência de dado e nunca grava direto no banco.

---

## Estrutura do repositório

```text
ironmind-ai/
├── mobile/            # App Expo + TypeScript
├── backend/           # API Spring Boot
├── infra/             # Docker Compose e scripts de inicialização do banco
├── docs/              # SPEC, API, modelo de dados, segurança
│   └── archive/       # Rascunhos anteriores de especificação
├── .github/workflows/ # CI
├── .env.example
└── README.md
```

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/SPEC.md`](docs/SPEC.md) | Especificação canônica: visão, requisitos, modelo de dados, API, IA, roadmap |
| [`docs/API.md`](docs/API.md) | Contrato da API, convenções, códigos de erro |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Modelo relacional e regras de integridade |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, controles implementados e pendências |

---

## Roadmap

| Fase | Conteúdo | Sprint |
|---|---|---|
| 1 — MVP | Auth, preferências, catálogo, programas, sessões, séries, histórico, volume, 1RM, recordes, dashboard | 1 a 4 |
| 2 — IA | Geração de treino por texto, sugestão de carga, chat de coaching, registro por voz, sincronização offline | 5 |
| 3 — Social | Perfil público, crews, publicações, XP, desafios, rankings, moderação | — |
| 4 — Avançado | Saúde e wearables, medidas e fotos, marketplace de criadores, cardio, análise visual | — |
| — | Plataforma **iOS** (mantém o design agnóstico; entra quando o Android estiver estável) | — |

Detalhamento e decisões pendentes: [`docs/SPEC.md`](docs/SPEC.md).

---

## Licença

Projeto de portfólio. Licença a definir antes de qualquer distribuição pública.
