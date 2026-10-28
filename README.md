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

> **Estágio atual: backend com identidade delegada e MongoDB; app Android na
> Sprint 6.** O backend não autentica ninguém: recebe o UUID do usuário no header
> `X-User-UUID`, injetado pelo gateway, e usa esse UUID como dono de cada
> recurso. Catálogo, programas, sessões, séries, analytics, recordes, restrições
> e IA funcionam de ponta a ponta contra a API real. O aplicativo mobile **ainda
> não foi migrado** para esse contrato: ele continua chamando `/auth/*` e
> `/users/me`, que não existem mais, e por isso precisa ser ajustado antes de
> voltar a falar com esta API.

| Área | Situação |
|---|---|
| Identidade delegada: header `X-User-UUID`, autorização por proprietário, `404` para recurso alheio | Implementado |
| Autenticação local (JWT, senha, refresh, recuperação, `/auth/*`, `/users/me`) | **Removida** do backend |
| Persistência: MongoDB 7 em replica set de 1 nó, transações nos recordes | Implementado |
| Catálogo seed de 59 exercícios, idempotente por nome | Implementado |
| Programas de treino (API): criar, listar, substituir, arquivar | Implementado |
| Sessões (API): iniciar, pausar, retomar, concluir, histórico paginado | Implementado |
| Séries (API): registrar, corrigir, excluir, com idempotência durável | Implementado |
| Analytics, volume, 1RM (Brzycki) e recordes transacionais | Implementado |
| Restrições de lesão e proposta de treino / sugestão de carga / coaching por IA | Implementado no backend — provedor `mock` por padrão |
| Backend: testes unitários JUnit (113 casos) | Passando |
| Suíte de contrato da API em Python contra `docker compose` | Passando |
| App Android: 5 abas, autenticação própria, catálogo, programa, sessão, séries, histórico, perfil e tema | Implementado, **mas ainda no contrato antigo da API** |
| Recursos sociais e gamificação | Planejado — Fase 3 |
| Política de privacidade e termos de uso | Rascunho — [`docs/PRIVACY.md`](docs/PRIVACY.md) e [`docs/TERMS.md`](docs/TERMS.md); falta revisão jurídica e publicação em URL pública |
| Publicação no Google Play (conta, keystore, AAB) | Pendente — checklist em [`docs/PLAY-RELEASE.md`](docs/PLAY-RELEASE.md) |

**Não descreva este projeto como se os recursos planejados já existissem.**
Consulte [`docs/SPEC.md`](docs/SPEC.md) para a visão completa e honesta.

---

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Mobile | React Native · Expo · TypeScript · Expo Router · TanStack Query · Zustand · Expo SQLite · expo-secure-store — **alvo: Android** |
| Backend | Java 25 · Spring Boot 3.5 · Spring Security (autorização) · Spring Data MongoDB · Bean Validation |
| API | REST `/api/v1` · OpenAPI 3 (springdoc) · identidade por header injetado pelo gateway |
| Dados | MongoDB 7 · replica set de 1 nó (transações) · índices criados a partir dos documentos |
| Infra | Docker · Docker Compose · GitHub Actions |
| IA | API de LLM consumida **exclusivamente pelo backend**, com saída estruturada e validação |

---

## Como executar

### Pré-requisitos

- Java 25 (JDK)
- Maven 3.10+
- Node.js 24+ e npm 11+ (apenas para o app)
- Docker Desktop

### 1. Stack completa (MongoDB + API)

```bash
cd infra
docker compose up -d --build
```

O `docker compose` sobe:

| Serviço | Papel |
|---|---|
| `mongo` | MongoDB 7 como replica set `rs0`, com autenticação e keyfile gerado no volume |
| `mongo-init` | Inicia o replica set uma única vez e só então libera a API |
| `api` | Backend em `http://localhost:8080` |

Acompanhe o log com `docker compose logs -f api` e derrube tudo (apagando os
dados) com `docker compose down -v`.

> **A porta 27017 já está ocupada nesta máquina?** O serviço local do MongoDB no
> Windows escuta `127.0.0.1:27017`. Publique o container em outra porta:
>
> ```powershell
> $env:MONGO_PORT = "27018"
> docker compose up -d --build
> ```
>
> A API e os testes usam a rede interna do compose; `MONGO_PORT` afeta apenas a
> inspeção do banco a partir do host.

### 2. Backend fora do container (opcional)

```bash
cd infra && docker compose up -d mongo mongo-init
cd ../backend
mvn spring-boot:run
```

O backend lê `MONGODB_URI` (padrão
`mongodb://ironmind:changeme@localhost:27017/ironmind?authSource=admin&replicaSet=rs0`).
Se você publicou o Mongo em outra porta, ajuste o URI:

```powershell
$env:MONGODB_URI = "mongodb://ironmind:changeme@localhost:27018/ironmind?authSource=admin&replicaSet=rs0"
mvn spring-boot:run
```

No Windows, o script evita o jar travar o `target/`:

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

> A IA sobe com `LLM_PROVIDER=mock`, que responde sem rede e sem credenciais.
> Para usar um provedor real, defina `LLM_PROVIDER=openai`, `LLM_API_KEY` e
> `LLM_MODEL`; sem esses valores o backend falha rápido na inicialização.

### 3. Identidade nas chamadas

Não existe login. Toda rota privada exige o header que o gateway injeta:

```bash
curl http://localhost:8080/api/v1/programs \
  -H "X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90"
```

Um UUID válido, mas sem dados, recebe listas vazias — nunca `401`. Header
ausente, duplicado, concatenado ou malformado em rota privada responde
`401 UNAUTHENTICATED`. O nome do header é configurável por
`USER_UUID_HEADER`.

> **Nunca exponha a porta da API diretamente na internet.** O serviço confia no
> header: quem alcança a porta pode se declarar outro usuário. A remoção do
> header enviado pelo cliente e a injeção do UUID validado são
> responsabilidade do gateway. Ver [`docs/SECURITY.md`](docs/SECURITY.md).

### 4. Aplicativo mobile

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

> O fluxo de autenticação do app ainda pertence ao contrato antigo
> (`/auth/*`, `/users/me`). Até a adaptação do mobile, use o modo mock para
> navegar pelo aplicativo.

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
> Ver [`docs/SPEC.md`](docs/SPEC.md#166-distribuição) e o checklist completo em
> [`docs/PLAY-RELEASE.md`](docs/PLAY-RELEASE.md) (conta, keystore, versionCode,
> *Data Safety* e URL web de exclusão).

### 5. Testes

**Backend — apenas testes unitários, sem banco:**

```bash
cd backend && mvn clean verify
```

**Contrato da API — suíte Python contra a stack do compose:**

```bash
cd infra
docker compose up -d --build
docker compose --profile test run --rm tests
```

A suíte em [`tests/integration/`](tests/integration/) fala somente com a API
pública: cria dados com identidades próprias, verifica isolamento entre
usuários, paginação, idempotência, recordes, analytics e IA. Ela não importa
código do backend nem acessa o MongoDB diretamente. Instruções em
[`tests/integration/README.md`](tests/integration/README.md).

> No PowerShell, `docker compose ... run` pode retornar exit code 1 por causa de
> avisos escritos em stderr (por exemplo, containers órfãos). Confira o resumo
> do `pytest` para saber se a suíte passou.

**Mobile — typecheck e testes unitários:**

```bash
cd mobile && npx tsc --noEmit && npx jest
```

---

## Arquitetura

```text
Cliente
   |
   | HTTPS / JSON
   v
Gateway (autentica a sessão e injeta X-User-UUID)
   |
   v
API REST — Spring Boot  (/api/v1)
   |
   +---- Identidade e autorização por proprietário
   +---- Exercícios
   +---- Programas e dias
   +---- Sessões, exercícios e séries
   +---- Analytics e recordes
   +---- Restrições de lesão
   +---- Serviço de IA  ---> API externa de LLM
   +---- Comunidade (Fase 3)
   |
   v
MongoDB 7 (replica set, transações)
```

Princípios que a arquitetura não negocia:

- Regras de negócio moram no serviço, nunca no controller.
- O cliente **nunca** é fonte de verdade para cálculo: volume, 1RM e recordes
  são calculados no backend.
- O `user_id` vem do header de identidade, nunca do corpo da requisição.
- O serviço não guarda conta, perfil, senha ou token: esses dados são do
  provedor de identidade.
- Cálculos determinísticos nunca passam pelo modelo de linguagem.
- A IA nunca inventa referência de dado e nunca grava direto no banco.

---

## Estrutura do repositório

```text
ironmind-ai/
├── mobile/                 # App Expo + TypeScript
├── backend/                # API Spring Boot
│   └── src/main/resources/catalog/exercises.json
├── infra/                  # Docker Compose e bootstrap do replica set
│   └── mongo/init-replica-set.js
├── tests/integration/      # Contrato da API em Python (pytest)
├── docs/                   # SPEC, API, modelo de dados, segurança
│   └── archive/            # Rascunhos anteriores de especificação
├── scripts/                # Utilitários de desenvolvimento
├── .github/workflows/      # CI
├── .env.example
└── README.md
```

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/SPEC.md`](docs/SPEC.md) | Especificação canônica: visão, requisitos, modelo de dados, API, IA, roadmap |
| [`docs/API.md`](docs/API.md) | Contrato da API, convenções, códigos de erro |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Coleções, índices e regras de integridade no MongoDB |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Modelo de ameaça, identidade delegada e controles implementados |
| [`docs/AUTH-INTEGRATION.md`](docs/AUTH-INTEGRATION.md) | Contrato da identidade delegada: header, premissas do gateway e autorização |
| [`docs/PRIVACY.md`](docs/PRIVACY.md) | Rascunho da política de privacidade — não publicado |
| [`docs/TERMS.md`](docs/TERMS.md) | Rascunho dos termos de uso — não publicado |
| [`docs/PLAY-RELEASE.md`](docs/PLAY-RELEASE.md) | Checklist de publicação no Google Play (conta, keystore, AAB, Data Safety) |

---

## Roadmap

| Fase | Conteúdo | Sprint |
|---|---|---|
| 1 — MVP | Identidade, catálogo, programas, sessões, séries, histórico, volume, 1RM, recordes, dashboard | 1 a 4 |
| 2 — IA | Geração de treino por texto, sugestão de carga, chat de coaching, registro por voz | 5 |
| 3 — Social | Perfil público, crews, publicações, XP, desafios, rankings, moderação | — |
| 4 — Avançado | Saúde e wearables, resolução de conflitos offline, medidas e fotos, marketplace de criadores, cardio, análise visual | — |
| — | Plataforma **iOS** (mantém o design agnóstico; entra quando o Android estiver estável) | — |

Detalhamento e decisões pendentes: [`docs/SPEC.md`](docs/SPEC.md).

---

## Licença

Projeto de portfólio. Licença a definir antes de qualquer distribuição pública.
