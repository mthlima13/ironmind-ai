# Convenções de contribuição — IronMind AI

Documento curto para quem (humano ou agente de IA) for escrever neste repositório.
As regras derivam de [`docs/SPEC.md`](docs/SPEC.md), que é a fonte da verdade do
produto.

---

## Regras inegociáveis

1. **A spec vence o código.** Se o código contradiz `docs/SPEC.md`, ou o código
   está errado, ou a spec está desatualizada. Um dos dois tem que mudar — e a
   mudança vem em PR separado quando afeta contrato.
2. **Segredos nunca entram no repositório.** Sem exceção. Use `.env.example`
   como referência dos nomes de variáveis.
3. **O backend é a fonte da verdade.** Volume, 1RM, recordes e validações de IA
   são calculados no backend. O cliente exibe; ele não decide.
4. **A IA não escreve no banco.** Ela propõe; o backend valida; o usuário
   confirma.
5. **`user_id` vem do header de identidade.** `X-User-UUID` é injetado pelo
   gateway e nunca é lido do corpo da requisição.
6. **Histórico é imutável.** Editar programa não altera sessões passadas.
7. **Não prometa o que não está pronto.** README, commit e PR descrevem o que
   existe, não o que está planejado.

---

## Idioma

| Artefato | Idioma |
|---|---|
| Código (classes, métodos, variáveis, comentários, Javadoc) | **Inglês** |
| Testes (nomes de método e asserção) | **Inglês** |
| Documentação, README, docs | **Português** |
| Mensagens de erro da API | **Português** (são lidas pelo usuário final) |
| Nomes de commit | **Inglês**, formato Conventional Commits |

---

## Estrutura

```
backend/src/main/java/com/ironmind/
  <dominio>/          # user (restrições), exercise, program, workout, record, analytics, ai, common
    <Dominio>Controller.java
    <Dominio>Service.java
    <Dominio>Repository.java
    entity/ dto/ exception/   # subpastas quando o dominio crescer
common/               # cross-cutting: ApiError, handler global, trace id, filtros
```

Regra de dependência: `controller → service → repository → entity`.
O controller **não** tem regra de negócio. A entity **não** vira JSON.

---

## Backend

- Java 25, Spring Boot 3.5, Maven.
- DTOs são `record`s; entities são classes com acesso por campo.
- Validação: Bean Validation no DTO + regra de domínio no service.
- Toda consulta a recurso privado filtra por owner **no repository ou service**.
- Erros usam as exceções de domínio já existentes — não lance `RuntimeException`
  genérica. O handler global traduz para o `ApiError` do Apêndice A.
- Novas rotas exigem: método HTTP, prefixo `/api/v1`, doc no OpenAPI e teste.
- Persistência em MongoDB (`@Document`, `MongoRepository`). Não há Flyway,
  schema SQL nem migration versionada: a evolução do modelo é feita no código e
  nos índices declarados nos documentos. Dados existentes são ajustados por
  rotina de migração quando necessário.

## Mobile

- TypeScript `strict: true`. Sem `any` — se o tipo não dá, crie um.
- Alvo do primeiro lançamento: **Android**. O código segue agnóstico de
  plataforma, mas **não** introduza código específico de iOS.
  Regras obrigatórias de Android em `docs/SPEC.md` §15.5.
- Estados obrigatórios em toda tela com dado: carregando, erro com retry, vazio
  com ação, offline/pendente.
- Tokens do provedor de identidade em `expo-secure-store`. Nunca em
  `AsyncStorage`. A API do IronMind não recebe nem guarda credencial.
- Chamadas de IA sempre pelo backend.
- Gesto de back do sistema respeitado em toda tela empilhada.
- Componentes de registro de série precisam de teste.

## Testes

- Regra de domínio sem teste é regra não implementada.
- Caso de borda (peso corporal, reps zero, sessão de outro usuário) tem teste.
- Teste de integração de backend **não** usa JUnit nem Testcontainers. A
  integração é uma suíte de contrato em Python (`tests/integration/`) contra a
  API real do `docker compose`.

---

## Commits

```
<tipo>(<escopo>): <descrição em ingles, imperativo, curto>
```

Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`.

```text
feat(workout): implement session set logging with idempotency
fix(records): recompute personal records on set correction
test(analytics): cover volume calculation edge cases
```

Um commit = uma mudança coerente. PR descreve o **porquê**, não o **o quê**
(o diff já mostra o quê).

---

## Antes de abrir PR

```bash
# backend (unitários)
cd backend && mvn clean verify

# contrato da API (Python, contra o compose)
cd infra && docker compose up -d --build
docker compose --profile test run --rm tests

# mobile
cd mobile && npx tsc --noEmit && npx jest
```

E confirme que o README continua descrevendo a **realidade** do código.
