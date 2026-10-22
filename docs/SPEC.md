# IronMind AI — Especificação Técnica do Produto

> **Treine com inteligência. Evolua com dados.**
>
> Documento canônico de visão, requisitos, modelo de dados, API e plano técnico
> para o aplicativo mobile de treinamento físico com inteligência artificial.

| Campo | Valor |
|---|---|
| Nome provisório | IronMind AI |
| Tipo | Aplicativo mobile **Android** (iOS planejado para fase posterior) |
| Stack | React Native + Expo + TypeScript (mobile) · Java + Spring Boot (backend) · PostgreSQL (dados) |
| Status | Planejamento. **Nenhum recurso descrito aqui está implementado.** |
| Documentos anteriores | `docs/archive/ironmind-ai-projeto.md`, `docs/archive/ironmind-ai-especificacao.md` |

> Este documento consolida dois rascunhos anteriores em uma única fonte da
> verdade. Quando algo divergir entre documentos antigos e este, **este vence**.
> Se algo divergir entre seções deste documento, a decisão pendente correspondente
> na [seção 20](#20-decisões-pendentes) prevalece.

---

## Sumário

1. [Visão do produto](#1-visão-do-produto)
2. [Escopo por fase](#2-escopo-por-fase)
3. [Perfis e permissões](#3-perfis-e-permissões)
4. [Requisitos funcionais](#4-requisitos-funcionais)
5. [Requisitos não funcionais](#5-requisitos-não-funcionais)
6. [Fluxos de usuário](#6-fluxos-de-usuário)
7. [Regras de negócio](#7-regras-de-negócio)
8. [Arquitetura](#8-arquitetura)
9. [Tecnologias](#9-tecnologias)
10. [Modelo de dados](#10-modelo-de-dados)
11. [API REST](#11-api-rest)
12. [Estratégia de IA](#12-estratégia-de-ia)
13. [Offline e sincronização](#13-offline-e-sincronização)
14. [Segurança, privacidade e conformidade](#14-segurança-privacidade-e-conformidade)
15. [Interface e navegação](#15-interface-e-navegação)
16. [Testes](#16-testes)
17. [Plano de execução](#17-plano-de-execução)
18. [Git e convenções](#18-git-e-convenções)
19. [Portfólio](#19-portfólio)
20. [Decisões pendentes](#20-decisões-pendentes)
21. [Próximos passos](#21-próximos-passos)
22. [Apêndice A — Contratos de API](#apêndice-a--contratos-de-api)
23. [Apêndice B — Bootstrap do repositório](#apêndice-b--bootstrap-do-repositório)

---

## 1. Visão do produto

O **IronMind AI** é um aplicativo de treinamento que ajuda o usuário a planejar,
registrar e analisar seus exercícios. Ele usa o histórico de treinos para gerar
sugestões personalizadas, permite criar planos por linguagem natural e transforma
dados de desempenho em informação acionável.

O produto combina:

- Registro rápido de séries, cargas e repetições.
- Planejamento de treinos e programas por dia.
- Recomendações assistidas por inteligência artificial.
- Histórico, gráficos e recordes pessoais.
- Acompanhamento de atividades cardiovasculares.
- Recursos sociais e gamificação.
- Funcionamento offline com sincronização posterior.

### 1.1 Objetivos

1. Tornar o registro de séries rápido e intuitivo — poucos toques durante o treino.
2. Ajudar o usuário a acompanhar a evolução com dados consistentes.
3. Oferecer sugestões contextualizadas, explicáveis e revisáveis, sem substituir
   profissionais de saúde ou educação física.
4. Entregar uma experiência mobile moderna, acessível e confiável.
5. Construir uma base técnica escalável para recursos futuros.
6. Demonstrar competências verificáveis de mobile, backend, dados, testes,
   segurança e integração com IA.

### 1.2 Público-alvo

- Pessoas que praticam musculação e acompanham progressão de carga.
- Usuários de divisões como Push/Pull/Legs, Upper/Lower e Full Body.
- Pessoas que praticam cardio ou outras modalidades.
- Treinadores e criadores de programas, em fases futuras.

### 1.3 Princípio central

> **Primeiro construir um registro de treino confiável; depois usar esses dados
> para gerar recomendações realmente úteis.**

> **A IA propõe; o backend valida; o usuário revisa e decide.**

### 1.4 Princípios não negociáveis

- Cálculos determinísticos (volume, 1RM, recordes) permanecem **no backend**, nunca
  no modelo de linguagem e nunca no cliente como fonte de verdade.
- A IA **nunca** inventa IDs de exercício, **nunca** grava direto no banco e
  **nunca** decide sozinha alterar um treino do usuário.
- O servidor **nunca** aceita `user_id` enviado pelo cliente como prova de
  identidade — o owner vem sempre da sessão autenticada.
- Chave de API de LLM **nunca** vai para o aplicativo mobile nem para o repositório.
- Não descrever recurso planejado como se estivesse implementado.

### 1.5 Plataforma de lançamento: Android first

O primeiro lançamento é **exclusivamente Android**. O iOS fica planejado para
uma fase posterior, sem alterar o desenho do produto.

**Por quê:**

- O público-alvo — musculação, treino em academia, uso em contexto de
  ginásio — adota Android em proporção muito maior, especialmente no Brasil.
- Ciclo de feedback mais curto: distribuição por track de teste do Google Play,
  sem revisão de loja bloqueando cada build.
- Custo de revisão e de operação zero para o MVP.

**O que isso não muda:**

- O código continua React Native + Expo, **sem bifurcação por plataforma**.
  Nenhum `Platform.OS === 'ios'` no núcleo do produto.
- A API e o modelo de dados são agnósticos de plataforma.
- Expo e as bibliotecas adotadas mantêm suporte a iOS, para não fechar a porta.

**O que muda no trabalho:**

- Nenhuma tarefa de iOS entra no backlog das Sprints 1 a 6.
- A validação de experiência é feita apenas em Android: gesto de back do
  sistema, edge-to-edge, permissões em runtime, notch e telas pequenas.
- Distribuição em **AAB** (Android App Bundle) pelo Play Console.

**Consequências de política (Google Play):**

- O app precisa de target API 35 (Android 15) ou superior para ser aceito.
- Exige conta de desenvolvedor, política de privacidade publicada e preenchimento
  do formulário *Data Safety*.
- Como o app cria conta, o Play exige **opção de exclusão de conta** dentro do
  app — o que já está previsto como RNF-017 e na pendência de exclusão de dados.
- Suporte a 16 KB de página para apps com bibliotecas nativas novas.

---

## 2. Escopo por fase

O desenvolvimento é dividido em fases para permitir entrega utilizável antes de
recursos avançados.

### Fase 1 — MVP

**Objetivo:** entregar um aplicativo de treino funcional e confiável.

- Cadastro, login e recuperação de acesso.
- Perfil, preferências, objetivos e restrições de treino.
- Catálogo inicial de exercícios com busca e filtros.
- Exercícios personalizados do usuário.
- Criação e edição de programas com dias e exercícios ordenados.
- Início, pausa e finalização de sessões.
- Registro de séries com carga, repetições, descanso e esforço percebido.
- Preenchimento rápido reaproveitando valores da última sessão.
- Histórico de treinos com paginação.
- Cálculo de volume e estimativa de 1RM.
- Detecção de recordes pessoais.
- Dashboard com resumo de atividade.
- API REST documentada com autenticação e autorização.
- Testes automatizados nas regras de domínio.
- Entrega inicial em **AAB** assinado, distribuída por track de teste do
  Google Play, com exclusão de conta acessível dentro do app.

### Fase 2 — IA e automação

- Geração de programa de treino a partir de texto.
- Sugestão de carga e repetições com base no histórico.
- Chat de coaching contextualizado.
- Registro de séries por voz com confirmação quando ambíguo.
- Detecção de inconsistências e confirmação de dados ambíguos.
- Recomendações de ajuste de treino sujeitas à validação do usuário.

### Fase 3 — Comunidade e gamificação

- Perfil público opcional.
- Amigos e equipes (*Crews*).
- Publicações de treinos e conquistas, reações e comentários.
- XP, sequência de atividade e desafios semanais.
- Rankings com regras transparentes e controles de privacidade.
- Denúncia, bloqueio e moderação — **pré-requisito de lançamento**, não opcional.

### Fase 4 — Recursos avançados

- Integração com plataformas de saúde e dispositivos compatíveis.
- Sincronização offline robusta com resolução de conflitos.
- Programas de criadores e marketplace.
- Medidas corporais e fotos privadas de progresso.
- Análise visual assistida por IA, com limitações explicitamente informadas.
- Cardio e métricas específicas por modalidade.
- Recursos de atividade ao vivo e integração com funcionalidades nativas.

> A lista de requisitos funcionais da [seção 4](#4-requisitos-funcionais) é a
> fonte de verdade de escopo. A fase atribuída a cada RF é a mesma aqui.

---

## 3. Perfis e permissões

### 3.1 Usuário autenticado

Gerencia próprio perfil, preferências, restrições, programas, sessões, séries,
histórico, recordes e configurações de privacidade.

### 3.2 Criador de programas — fase futura

Publica programas, gerencia descrições e acompanha métricas permitidas pela
plataforma. Qualquer recurso comercial depende de regras próprias de pagamento,
moderação e suporte.

### 3.3 Administrador

Gerencia catálogo de exercícios, denúncias, conteúdo inadequado e configurações
operacionais. O acesso administrativo deve ser restrito, auditável e protegido
por permissões específicas — nunca por um campo booleano no `users`.

### 3.4 Regra de acesso a recursos

> Um usuário nunca acessa nem modifica dados privados de outro usuário sem
> permissão explícita **validada pelo backend**.

A validação de propriedade é aplicada em **todas** as operações, inclusive de
leitura (ver [RNF-003](#5-requisitos-não-funcionais)). O filtro por owner é
aplicado na camada de repositório/serviço, não apenas no controller.

---

## 4. Requisitos funcionais

| ID | Requisito | Fase | Prioridade |
|---|---|---|---|
| RF-001 | Permitir cadastro, autenticação e recuperação de acesso | 1 | Alta |
| RF-002 | Permitir editar perfil, preferências, unidades e objetivos de treino | 1 | Alta |
| RF-003 | Consultar catálogo de exercícios com busca e filtros | 1 | Alta |
| RF-004 | Criar exercício personalizado do usuário | 1 | Média |
| RF-005 | Criar, editar, ordenar, arquivar e excluir programas próprios | 1 | Alta |
| RF-006 | Iniciar, pausar e finalizar sessão de treino | 1 | Alta |
| RF-007 | Adicionar e ordenar exercícios na sessão | 1 | Alta |
| RF-008 | Registrar série com carga, repetições, descanso e esforço percebido | 1 | Alta |
| RF-009 | Corrigir ou editar uma série já registrada | 1 | Alta |
| RF-010 | Preencher a série reaproveitando valores da última sessão | 1 | Alta |
| RF-011 | Consultar histórico de sessões com paginação | 1 | Alta |
| RF-012 | Calcular volume total de treino por exercício e sessão | 1 | Alta |
| RF-013 | Estimar 1RM com fórmula documentada | 1 | Média |
| RF-014 | Detectar recordes pessoais com regras documentadas | 1 | Alta |
| RF-015 | Exibir dashboard com resumo de atividade | 1 | Média |
| RF-016 | Informar limitações e exercícios a evitar | 1 | Alta |
| RF-017 | Exibir gráficos de evolução por exercício | 1 | Média |
| RF-018 | Gerar proposta de treino a partir de texto usando IA | 2 | Média |
| RF-019 | Sugerir carga e repetições com base no histórico | 2 | Média |
| RF-020 | Chat de coaching contextualizado sobre os dados registrados | 2 | Média |
| RF-021 | Converter comando de voz em dados para revisão do usuário | 2 | Média |
| RF-022 | Sincronizar alterações feitas offline | 2 | Média |
| RF-023 | Compartilhar treinos e conquistas com controles de privacidade | 3 | Baixa |
| RF-024 | Criar equipes, desafios e rankings | 3 | Baixa |
| RF-025 | Denunciar, bloquear e moderar conteúdo de outros usuários | 3 | Alta |
| RF-026 | Sincronizar dados de saúde de provedores compatíveis | 4 | Média |
| RF-027 | Gerenciar medidas corporais e fotos privadas de progresso | 4 | Média |
| RF-028 | Gerenciar programas publicados por criadores | 4 | Baixa |
| RF-029 | Registrar cardio, pilates e esportes | 4 | Média |
| RF-030 | Análise visual assistida por IA, com limitações informadas | 4 | Baixa |

> **Prioridade** indica o peso relativo dentro da fase. **Fase** indica quando a
> funcionalidade entra. RF-016 (limitações) é prioridade alta na **Fase 1**, pois
> a IA da Fase 2 depende de restrições corretas — as versões anteriores das
> especificações marcavam o requisito como alto mas o omitiam do MVP.

---

## 5. Requisitos não funcionais

| ID | Requisito | Verificação |
|---|---|---|
| RNF-001 | Comunicação cliente-servidor por HTTPS em ambientes publicados | Configuração de ambiente |
| RNF-002 | Senhas com hash moderno (Argon2id ou BCrypt), nunca em texto puro | Teste unitário do encoder |
| RNF-003 | Autorização por recurso e usuário no backend, inclusive em leituras | Teste de acesso cruzado entre usuários |
| RNF-004 | Validação de entrada no aplicativo **e** na API | Testes de DTO inválido |
| RNF-005 | Acessibilidade: contraste, alvos de toque, alternativas a cor, leitor de tela | Revisão manual + teste de componente |
| RNF-006 | Interface responsiva e adequada a diferentes tamanhos de tela e versões de OS | Testes em simuladores |
| RNF-007 | Mensagens de erro compreensíveis, sem stack trace, segredo ou detalhe interno | Teste de handler de exceção |
| RNF-008 | Testes automatizados cobrindo regras de domínio e endpoints críticos | CI verde |
| RNF-009 | Logs sem senhas, tokens ou dados sensíveis desnecessários | Revisão de config de log |
| RNF-010 | Estratégia de backup e recuperação do banco definida e testada | Runbook documentado |
| RNF-011 | Consentimento explícito para recursos que tratam dados sensíveis | Tela de consentimento |
| RNF-012 | Idempotência em operações de registro para reduzir duplicação | Teste de requisição repetida |
| RNF-013 | Documentação de instalação, execução e implantação | README + `docs/` |
| RNF-014 | Manutenibilidade: controllers, services, repositories e DTOs separados | Revisão de arquitetura |
| RNF-015 | Portabilidade: backend independente do cliente por API versionada | Contrato OpenAPI |
| RNF-016 | Observabilidade: correlação de requisição e log estruturado | Middleware de correlation id |
| RNF-017 | Exportação e exclusão de dados pelo usuário | Endpoint + procedimento |
| RNF-018 | Metas de desempenho definidas e medidas por teste | Baseline registrado |

> Não prometer disponibilidade, tempo de resposta ou acurácia antes de ter
> infraestrutura, métricas e dados reais.

---

## 6. Fluxos de usuário

### 6.1 Registrar um treino

1. O usuário abre a tela inicial.
2. Seleciona um programa e um dia, ou inicia um treino livre.
3. Escolhe um exercício.
4. Registra carga, repetições e, opcionalmente, esforço percebido.
5. O aplicativo sugere valores da última sessão como atalho.
6. O usuário confirma a série.
7. O sistema salva o registro e verifica se houve novo recorde.
8. Ao finalizar, a sessão aparece no histórico e nas estatísticas.

### 6.2 Gerar treino com IA

1. O usuário descreve o objetivo em linguagem natural.
2. O aplicativo envia o pedido à API.
3. O backend recupera preferências, experiência, equipamentos, restrições e
   histórico relevante.
4. O serviço de IA gera uma proposta estruturada.
5. O backend valida formato, existência dos exercícios, limites de séries e
   reps, e conformidade com as restrições.
6. O usuário revisa e ajusta a proposta.
7. **Somente após confirmação** o programa é salvo.

### 6.3 Registrar série por voz

1. O usuário inicia a captura de voz.
2. O sistema transcreve a fala.
3. A aplicação interpreta carga, repetições e exercício no contexto atual.
4. Se houver ambiguidade, solicita confirmação explícita.
5. A série é gravada apenas após a confirmação necessária.

Exemplo de entrada: "cem quilos por oito".

> A interpretação respeita unidades, idioma e configurações do usuário. A
> entrada manual permanece sempre disponível como alternativa.

### 6.4 Corrigir um registro

1. O usuário abre o histórico e seleciona a série.
2. Corrige carga ou repetições.
3. O backend atualiza o registro, recalcula volume e **reavalia os recordes
   transacionalmente** (um recorde pode deixar de valer).
4. A sessão reflete o valor corrigido sem perder o vínculo com a série original.

---

## 7. Regras de negócio

### 7.1 Registro de séries

1. Uma série pertence a um exercício realizado dentro de uma sessão.
2. Carga e distância aceitam apenas valores válidos e não negativos.
3. Repetições são inteiros válidos para o tipo de exercício.
4. O sistema registra quando a série foi concluída.
5. Uma série editada continua associada ao histórico correto.
6. Repetir a mesma requisição por falha de rede não cria duplicatas quando há
   chave de idempotência.
7. Uma sessão finalizada não recebe novas séries sem reabertura explícita.

### 7.2 Volume de treino

Para séries com carga e repetições registradas:

```
volume = carga × repetições
```

O volume total de um exercício ou sessão é a soma das séries válidas.

**Casos a definir antes da implementação** (ver [seção 20](#20-decisões-pendentes)):

- Exercícios com peso corporal ou assistência — contar no volume ou não.
- Séries com apenas reps (sem carga) — entram como zero ou são excluídas.
- Movimento em que volume não é métrica adequada (isométrico, por tempo).

> **Unidade canônica de armazenamento: quilograma.** O app exibe em `lb` ou `kg`
> conforme `user_preferences.preferred_units`, convertendo na fronteira de
> apresentação. O banco nunca guarda valor ambíguo.

### 7.3 Estimativa de 1RM

O app exibe uma estimativa de repetição máxima usando **uma fórmula documentada**
(fórmula de Brzycki ou Epley — a escolha está pendente). A estimativa não é
medição real e é imprecisa com muitas repetições, em exercícios isolados ou com
carga subestimada por assistências.

A estimativa é calculada apenas no backend e marcada como estimativa na interface.

### 7.4 Recordes pessoais

- Comparar a nova série com os registros válidos do mesmo usuário e exercício.
- Tipos de recorde suportados: maior carga, maior número de reps em uma carga
  específica, melhor 1RM estimado.
- Não comparar valores de unidades incompatíveis.
- Atualizar recordes **de forma transacional** para evitar inconsistências.
- Ao corrigir ou excluir uma série, reavaliar os recordes derivados.
- Informar ao usuário qual tipo de recorde foi alcançado.

### 7.5 Sugestão de carga

- Usar o histórico do próprio usuário e o objetivo informado.
- Exibir a sugestão como **ponto de partida**, não como obrigação.
- Considerar qualidade dos dados, esforço percebido e contexto disponível.
- Permitir ajuste manual e rejeição da recomendação.
- **Não** aumentar a carga automaticamente por causa de uma melhora isolada.
- Se o histórico for insuficiente ou inconsistente, informar isso em vez de
  aparentar precisão inexistente.

### 7.6 Preservação de histórico

> Alterar ou excluir um programa **não** deve modificar sessões já realizadas.
> Sessões realizadas gravam snapshot dos valores no momento do registro.

---

## 8. Arquitetura

### 8.1 Visão de alto nível

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

Serviços complementares:
- Armazenamento de objetos privado (fotos, Fase 4)
- Notificações push
- Observabilidade e logs estruturados
- Fila para sincronização offline
```

### 8.2 Responsabilidades por camada (backend)

| Camada | Responsabilidade |
|---|---|
| **Controller** | Recebe requisição HTTP, valida formato, devolve resposta. Sem regra de negócio. |
| **Service** | Regras de negócio, transações, orquestração. |
| **Repository** | Consulta e persiste dados, sempre filtrado por owner quando aplicável. |
| **Entity** | Modelo persistido, mapeado por JPA/Flyway. |
| **DTO** | Contrato de entrada e saída da API. Nunca expor entidades. |
| **Security** | Autenticação, autorização, filtros de owner, configuração de acesso. |
| **Integration** | Comunicação com serviços externos, incluindo o provedor de LLM. |
| **Validation** | Bean Validation e validações de domínio. |

**Proibições explícitas:**

- Regra de negócio dentro do controller.
- Depender de resposta livre da IA para alterar o banco sem validação.
- Consultar repositório de entidade privada sem escopo de usuário.
- Expor entidade JPA diretamente no JSON de resposta.

### 8.3 Estrutura do repositório

```text
ironmind-ai/
├── mobile/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── workouts/
│   │   │   ├── exercises/
│   │   │   ├── programs/
│   │   │   ├── analytics/
│   │   │   └── coach/
│   │   ├── navigation/
│   │   ├── services/
│   │   ├── storage/
│   │   ├── hooks/
│   │   └── types/
│   ├── app.json
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/ironmind/
│   │   │   │   ├── auth/
│   │   │   │   ├── user/
│   │   │   │   ├── exercise/
│   │   │   │   ├── program/
│   │   │   │   ├── workout/
│   │   │   │   ├── record/
│   │   │   │   ├── analytics/
│   │   │   │   ├── ai/
│   │   │   │   └── common/
│   │   │   └── resources/db/migration/
│   │   └── test/
│   ├── pom.xml
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   └── init/01-init.sql
├── docs/
│   ├── SPEC.md
│   ├── API.md
│   ├── DATA-MODEL.md
│   ├── SECURITY.md
│   └── archive/
├── scripts/
│   └── check-env.ps1
├── .github/
│   └── workflows/ci.yml
├── .env.example
├── .gitignore
├── AGENTS.md
├── CONTRIBUTING.md
└── README.md
```

> A estrutura é referência inicial e pode ser ajustada conforme as convenções
> reais do código.

---

## 9. Tecnologias

### 9.1 Aplicativo mobile

- **React Native** + **Expo** + **TypeScript**
- **React Navigation** ou **Expo Router** (Expo Router é o padrão adotado)
- Gerenciamento de estado: TanStack Query para servidor + Zustand para estado de UI
- Armazenamento local: SQLite (Expo SQLite) para rascunhos e fila offline
- `expo-secure-store` para token de acesso
- Testes: Jest + React Native Testing Library

**Alvo do primeiro lançamento: Android** (ver [seção 1.5](#15-plataforma-de-lançamento-android-first)).

Bibliotecas e serviços exigem verificação da versão mínima de Android
(API level) suportada, e o `targetSdkVersion` do app deve ser 35 ou superior
para atender a política do Google Play. Recursos específicos de sistema
operacional — notificações, câmera e microfone para registro por voz, atalhos,
widgets — são verificados **apenas para Android** nesta fase.

O `expo-notifications` exige, a partir do Android 13 (API 33), solicitação
explícita de permissão de notificação em runtime, com fallback para o
comportamento anterior quando o usuário nega.

### 9.2 Backend

- **Java 21** + **Spring Boot 3.x**
- **Spring Security** (JWT com access + refresh token)
- **Spring Data JPA** + **Hibernate**
- **Bean Validation**
- **Maven**
- **Flyway** para versionamento de schema
- **OpenAPI 3 / springdoc-openapi** para documentação
- Testes: JUnit 5, AssertJ, Mockito, Testcontainers (PostgreSQL)

### 9.3 Dados e infraestrutura

- **PostgreSQL 16** como banco principal
- **Docker** + Docker Compose para ambiente local
- **Redis** opcional para cache, rate limiting ou filas — só quando houver
  necessidade demonstrada
- Armazenamento de objetos privado para fotos, quando a Fase 4 chegar
- CI/CD executando build e testes

### 9.4 Inteligência artificial

- API de modelo de linguagem (LLM) acessada **exclusivamente pelo backend**
- Saída estruturada validada por DTO e esquema JSON fixo
- Serviço isolado com timeout, retry limitado e circuit breaker
- Limites de uso por usuário, controle de custos e registro de consumo
- **Chave de API nunca no aplicativo mobile nem no repositório**

---

## 10. Modelo de dados

UUID como chave primária em todas as tabelas. Todas as entidades com
`created_at` / `updated_at` conforme aplicável. Índices por `user_id`, data e
`exercise_id`.

### 10.1 `users`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `name` | varchar | |
| `email` | varchar unique | |
| `password_hash` | varchar | Argon2id ou BCrypt; nunca texto puro |
| `role` | enum | `USER`, `CREATOR`, `ADMIN` — default `USER` |
| `timezone` | varchar | IANA, ex. `America/Sao_Paulo` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 10.2 `user_preferences`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | unique |
| `preferred_units` | enum | `KG` \| `LB` |
| `training_experience` | enum | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` |
| `goal` | enum | `HYPERTROPHY` \| `STRENGTH` \| `ENDURANCE` \| `GENERAL` |
| `available_equipment` | jsonb | Lista de equipamentos disponíveis |
| `training_days` | smallint | Dias por semana |
| `privacy_settings` | jsonb | Visibilidade de perfil, recordes, etc. |

> Este é o insumo principal do contexto de IA. Sem ele, a Fase 2 geraria
> propostas genéricas.

### 10.3 `exercises`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `name` | varchar | |
| `description` | text | |
| `primary_muscle_group` | varchar | |
| `secondary_muscle_groups` | jsonb | |
| `equipment` | varchar | |
| `instructions` | text | |
| `movement_type` | enum | `COMPOUND` \| `ISOLATION` \| `CARDIO` \| `ISOMETRIC` |
| `is_system` | boolean | `true` para o catálogo seed; `false` para o do usuário |
| `created_by_user_id` | UUID FK → users | nullable; `null` para exercício do sistema |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

> `is_system = true` + `created_by_user_id = null` é a definição de exercício
> global, legível e editável apenas por administrador.

### 10.4 `workout_programs`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `name` | varchar | |
| `description` | text | |
| `goal` | enum | espelha `user_preferences.goal` |
| `split_type` | varchar | `PPL`, `UPPER_LOWER`, `FULL_BODY`, `CUSTOM` |
| `is_archived` | boolean | arquivar ≠ excluir |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 10.5 `program_days`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `program_id` | UUID FK → workout_programs | cascade delete |
| `name` | varchar | ex. "Peito e Tríceps" |
| `position` | int | ordenação |

### 10.6 `program_exercises`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `program_day_id` | UUID FK → program_days | cascade delete |
| `exercise_id` | UUID FK → exercises | |
| `position` | int | ordenação |
| `target_sets` | int | |
| `target_reps_min` | int | |
| `target_reps_max` | int | |
| `rest_seconds` | int | |
| `notes` | text | nullable |

### 10.7 `workout_sessions`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `program_id` | UUID FK → workout_programs | nullable (treino livre) |
| `program_day_id` | UUID FK → program_days | nullable |
| `started_at` | timestamptz | |
| `completed_at` | timestamptz | nullable |
| `status` | enum | `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `ABANDONED` |
| `notes` | text | nullable |
| `created_at` | timestamptz | |

### 10.8 `session_exercises`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `session_id` | UUID FK → workout_sessions | cascade delete |
| `exercise_id` | UUID FK → exercises | |
| `position` | int | |
| `notes` | text | nullable |

### 10.9 `exercise_sets`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `session_exercise_id` | UUID FK → session_exercises | cascade delete |
| `set_number` | int | sequencial dentro do exercício |
| `weight_kg` | numeric(6,2) | **unidade canônica: kg**; null para peso corporal |
| `repetitions` | int | |
| `duration_seconds` | int | nullable (isométrico, cardio) |
| `distance_meters` | int | nullable (cardio) |
| `perceived_exertion` | smallint | nullable — RPE 1..10 |
| `rest_after_seconds` | int | nullable |
| `completed_at` | timestamptz | |
| `created_at` | timestamptz | |
| `idempotency_key` | varchar unique | nullable; ver [RNF-012](#5-requisitos-não-funcionais) |

### 10.10 `personal_records`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `exercise_id` | UUID FK → exercises | |
| `record_type` | enum | `MAX_WEIGHT`, `MAX_REPS_AT_WEIGHT`, `BEST_ESTIMATED_1RM` |
| `value` | numeric(8,2) | valor na unidade canônica do tipo |
| `unit` | varchar | `kg`, `reps`, `kg` (estimado) |
| `source_set_id` | UUID FK → exercise_sets | nullable |
| `achieved_at` | timestamptz | |

> Unicidade por `(user_id, exercise_id, record_type)`. Recalculado
> transacionalmente a cada alteração de série.

### 10.11 `injury_restrictions`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `body_region` | varchar | ex. "ombro direito" |
| `description` | text | |
| `is_active` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

> Informações sobre lesões são **dados pessoais sensíveis**. Coleta opcional,
> acesso restrito ao próprio usuário (e a administrador com auditoria),
> finalidade declarada e opção de revogar/excluir.

### 10.12 `restriction_exercises` (associativa)

| Campo | Tipo | Observação |
|---|---|---|
| `restriction_id` | UUID FK → injury_restrictions | PK composta |
| `exercise_id` | UUID FK → exercises | PK composta |

> Exercícios a evitar **não** ficam como array em coluna — relação N:N real,
> indexável e com integridade referencial.

### 10.13 `ai_recommendations`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `recommendation_type` | enum | `WORKOUT_PROGRAM`, `LOAD_SUGGESTION`, `COACH_REPLY` |
| `input_summary` | text | contexto de entrada, sem dados sensíveis desnecessários |
| `result_json` | jsonb | saída estruturada validada |
| `model_version` | varchar | modelo + versão usados |
| `status` | enum | `PENDING`, `ACCEPTED`, `EDITED`, `REJECTED`, `ERROR` |
| `created_at` | timestamptz | |
| `accepted_at` | timestamptz | nullable |

> Não guardar conversa completa. Definir política de retenção e exclusão.

### 10.14 Relacionamentos

- Um usuário possui vários programas, sessões, preferências e restrições.
- Um programa possui vários dias; cada dia possui vários exercícios ordenados.
- Uma sessão possui vários exercícios realizados; cada um possui várias séries.
- Um exercício aparece em vários programas, dias e sessões.
- Um usuário pode ter vários recordes, um por tipo e exercício.
- Uma recomendação de IA pertence a um usuário e **não altera treino sem
  confirmação**.

---

## 11. API REST

Prefixo: `/api/v1`. Todos os endpoints privados exigem `Authorization: Bearer <token>`.

### 11.1 Autenticação e usuário

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/auth/register` | Criar conta |
| `POST` | `/auth/login` | Autenticar e emitir tokens |
| `POST` | `/auth/refresh` | Renovar access token |
| `POST` | `/auth/logout` | Revogar refresh token |
| `POST` | `/auth/forgot-password` | Iniciar recuperação de acesso |
| `POST` | `/auth/reset-password` | Concluir recuperação de acesso |
| `GET` | `/users/me` | Consultar perfil e preferências |
| `PATCH` | `/users/me` | Atualizar perfil e preferências |

### 11.2 Exercícios

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/exercises` | Listar e filtrar exercícios |
| `GET` | `/exercises/{id}` | Consultar exercício |
| `POST` | `/exercises` | Criar exercício personalizado |
| `PATCH` | `/exercises/{id}` | Editar exercício próprio |

### 11.3 Programas

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/programs` | Listar programas do usuário |
| `POST` | `/programs` | Criar programa |
| `GET` | `/programs/{id}` | Consultar programa com dias e exercícios |
| `PUT` | `/programs/{id}` | Atualizar programa |
| `DELETE` | `/programs/{id}` | Arquivar (soft delete) |

### 11.4 Sessões e séries

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/workout-sessions` | Iniciar sessão |
| `GET` | `/workout-sessions` | Histórico com paginação e filtros |
| `GET` | `/workout-sessions/{id}` | Consultar sessão |
| `PATCH` | `/workout-sessions/{id}` | Pausar / retomar / abandonar |
| `POST` | `/workout-sessions/{id}/exercises` | Adicionar exercício à sessão |
| `POST` | `/workout-sessions/{id}/sets` | Registrar série (com idempotency key) |
| `PATCH` | `/sets/{id}` | Corrigir série |
| `DELETE` | `/sets/{id}` | Excluir série e reavaliar recordes |
| `POST` | `/workout-sessions/{id}/complete` | Finalizar sessão |

### 11.5 Analytics, recordes e restrições

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/analytics/overview` | Resumo de desempenho do período |
| `GET` | `/analytics/exercises/{id}` | Evolução por exercício |
| `GET` | `/records` | Listar recordes pessoais |
| `GET` | `/restrictions` | Consultar restrições do usuário |
| `PUT` | `/restrictions` | Atualizar restrições |

### 11.6 IA

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/ai/workout-proposals` | Gerar proposta de treino |
| `POST` | `/ai/load-suggestions` | Sugerir carga e repetições |
| `POST` | `/ai/coach` | Conversa de coaching contextualizada |
| `POST` | `/ai/voice-interpretation` | Interpretar transcrição de voz |

### 11.7 Convenções da API

- DTOs de entrada e saída; **entidades nunca são serializadas diretamente**.
- Validação com Bean Validation + regras de domínio.
- Listagens e históricos **sempre paginados** (`page`, `size`, `sort`).
- Códigos HTTP apropriados e corpo de erro no formato único do
  [Apêndice A](#apêndice-a--contratos-de-api).
- Propriedade do recurso validada em **todas** as operações.
- `Idempotency-Key` (header) em operações de escrita que criam registro.
- Documentação OpenAPI gerada e versionada junto com o código.
- Nunca retornar stack trace, caminho de arquivo ou segredo ao cliente.
- `user_id` **nunca** é lido do corpo da requisição; vem do token.

---

## 12. Estratégia de IA

### 12.1 Princípio arquitetural

> A IA propõe; o backend valida; o usuário revisa e decide.

### 12.2 Geração de programas

O modelo retorna um objeto estruturado validado por esquema definido no backend.

```json
{
  "name": "Treino de costas",
  "goal": "HYPERTROPHY",
  "days": [
    {
      "name": "Costa",
      "exercises": [
        {
          "exerciseId": "UUID_DO_EXERCICIO",
          "sets": 3,
          "repRange": { "min": 8, "max": 12 },
          "restSeconds": 120
        }
      ]
    }
  ],
  "explanation": "Proposta inicial para revisão do usuário."
}
```

**Fluxo obrigatório:**

1. App envia o pedido em linguagem natural.
2. Backend autentica e resolve o owner a partir da sessão.
3. Backend monta o contexto: preferências, experiência, equipamentos,
   restrições ativas, exercício do catálogo e histórico relevante.
4. Serviço de IA chama o LLM com o contexto mínimo necessário.
5. Resposta é desserializada em DTO e validada contra o esquema.
6. Backend verifica: IDs de exercício existem; belong to catálogo; sets e reps
   dentro dos limites configurados; respeita restrições ativas.
7. Referências inválidas são **descartadas ou substituídas**, nunca aceitas.
8. Usuário revisa, edita ou rejeita.
9. Só então o programa é persistido.

> A IA não inventa IDs de exercício e não grava diretamente no banco.

### 12.3 Sugestão de carga

Começar com **regras simples e explicáveis**, antes de qualquer modelo próprio:

1. Consultar séries anteriores do mesmo exercício.
2. Considerar carga, repetições e esforço percebido, quando disponíveis.
3. Verificar se o histórico é suficiente e consistente.
4. Produzir sugestão conservadora e **explicar sua origem**.
5. Permitir ajuste ou rejeição pelo usuário.
6. Registrar aceitação/edição/rejeição para avaliar qualidade futura.

> Não aumentar carga automaticamente só porque o usuário completou uma série. Dor,
> fadiga, técnica, equipamento e contexto individual importam.

A IA pode, em fase posterior, resumir tendências e sugerir ajustes — sempre
com a mesma regra: proposta → validação → revisão do usuário.

### 12.4 Limites de segurança

- A IA **não** diagnostica lesões nem prescreve tratamento.
- Quando o usuário relatar dor ou limitação, orientar a interromper movimentos
  que agravem o problema e buscar profissional qualificado.
- **Não** recomendar substâncias ou protocolos de suplementação como tratamento.
- Não prometer resultados físicos nem projeções exatas.
- Não usar dados pessoais do usuário para treinar modelos sem base legal,
  transparência e consentimento.
- Exibir de forma visível que as sugestões são informativas e precisam ser
  avaliadas pelo usuário.
- Testar respostas adversas, incompletas, inválidas e fora de escopo.
- Limitar uso por usuário (rate limiting) e controlar custo por chamada.
- Timeout, retry limitado e circuit breaker no cliente do LLM.

---

## 13. Offline e sincronização

O treino deve continuar funcionando quando a conexão cair.

### 13.1 Estratégia

1. Salvar localmente as alterações permitidas.
2. Atribuir identificador único (UUID) a cada operação.
3. Marcar registros como `PENDING`, `SYNCED` ou `ERROR`.
4. Enviar operações quando a conexão voltar.
5. Usar chaves de idempotência para impedir duplicações.
6. Tratar conflitos com regras documentadas.
7. Informar o usuário o estado da sincronização.

### 13.2 Regras de conflito

- O backend é a **fonte definitiva** dos dados sincronizados.
- Edição simultânea: **last-write-wins por campo, com aviso** quando ambas as
  versões divergirem no mesmo campo.
- Exclusão contra edição: exclusão prevalece, com registro do conflito.
- Sessão iniciada em mais de um dispositivo: cada dispositivo mantém sua
  sessão; a fusão ocorre por operação, nunca por sobrescrita de sessão.
- **Nunca** sobrescrever silenciosamente uma série já registrada.

---

## 14. Segurança, privacidade e conformidade

### 14.1 Autenticação e autorização

- HTTPS obrigatório em ambientes publicados.
- Senhas com hash moderno (Argon2id ou BCrypt) e política de senha mínima.
- Access token curto + refresh token rotativo, revogáveis, armazenados com
  `expo-secure-store` no app.
- Autorização aplicada em **todos** os endpoints privados, inclusive leitura.
- Token carries `userId` e `role`; o backend nunca confia em `user_id` do corpo.

### 14.2 Dados e abuso

- Rate limiting em autenticação, recuperação de senha e todos os endpoints de IA.
- Validação de arquivos enviados: formato, tamanho e verificação de conteúdo.
- Proteção de fotos e dados corporais com acesso privado e URLs assinadas.
- CORS restrito às origens do aplicativo publicado.
- CSP e headers de segurança no serviço de API.

### 14.3 Privacidade

- Coletar o mínimo de dados pessoais necessário.
- Consentimento explícito para dados de saúde, restrições e fotos.
- Permitir que o usuário compreenda, **exporte** e solicite a **exclusão** dos
  seus dados.
- Definir retenção e exclusão de dados sensíveis e de recomendações de IA.
- Proteger dados locais no dispositivo e limpar rascunhos no logout.

### 14.4 Conformidade

- Revisar obrigações da **LGPD** antes de publicar o produto.
- Atender à política do **Google Play** para o primeiro lançamento:
  - `targetSdkVersion` 35 ou superior.
  - Formato de distribuição **AAB**.
  - Formulário *Data Safety* preenchido e coerente com a coleta real.
  - URL de política de privacidade publicada.
  - Opção de exclusão de conta acessível dentro do app (exigência do Play para
    apps que criam conta).
  - Classificação de conteúdo e declaração de anúncios.
- Criar política de privacidade e termos de uso antes do lançamento público.
- Criar política de denúncia, bloqueio e moderação **antes** de liberar recursos
  sociais.
- A conformidade com a App Store fica como requisito da fase de iOS.

### 14.5 Segredos e infraestrutura

- Segredos em variáveis de ambiente ou gerenciador de segredos.
- `.env` com credenciais reais **nunca** versionado — apenas `.env.example`.
- Logging sem senhas, tokens, conteúdo corporal ou chats completos.

---

## 15. Interface e navegação

### 15.1 Abas principais

1. **Início:** resumo do dia e acesso rápido ao treino.
2. **Treinos:** programas, dias, divisão atual e catálogo de exercícios.
3. **Começar treino:** sessão ativa, registro de séries e descanso.
4. **Evolução:** gráficos, volume, recordes e histórico.
5. **Perfil:** preferências, restrições, privacidade e configurações.

> O chat de IA é acessado a partir de **Treinos** e **Evolução**, para receber
> contexto relevante sem sobrecarregar a navegação principal.

### 15.2 Direção visual

- Tema escuro com grafite e verde-limão como cor de destaque.
- Tipografia legível e hierarquia visual clara.
- Botões grandes para uso durante o treino (alvo de toque ≥ 44pt).
- Registro de série em poucos toques.
- Contraste adequado e alternativas a informações transmitidas só por cor.
- Estados visíveis para: carregando, erro, vazio e sincronização pendente.

### 15.3 Telas do MVP

- Boas-vindas e autenticação.
- Recuperação de acesso.
- Configuração inicial de perfil (unidades, objetivo, equipamento).
- Dashboard.
- Catálogo e busca de exercícios.
- Lista de programas.
- Editor de programa (dias → exercícios → séries/reps alvo).
- Treino em andamento.
- Registro/edição de série.
- Resumo da sessão concluída.
- Histórico.
- Detalhe do exercício e gráficos.
- Recordes pessoais.
- Restrições e limitações.
- Configurações e privacidade.

### 15.4 Estados obrigatórios

Toda tela com dados precisa de: carregando, erro com ação de retry, vazio com
ação de primeiro uso, e offline/pendente de sincronização.

### 15.5 Adaptações Android obrigatórias

O primeiro lançamento é Android. Estes itens **não são opcionais** — sem eles o
app falha na revisão ou irrita no uso diário.

| Item | Requisito |
|---|---|
| Gesto de back do sistema | Cada tela empilhada fecha no gesto; a tela inicial confirma antes de sair. `BackHandler` do React Native |
| Back preditivo (Android 13+) | A navegação usa a API de back preditivo, com fallback para `BackHandler` em versões anteriores |
| Edge-to-edge (Android 15) | O app desenha sob as barras do sistema e aplica `padding`/`insets` seguros via `react-native-safe-area-context` |
| Barra de status e navegação | Cores e contraste garantidos nos dois temas, com ícones legíveis sobre o fundo |
| Teclado | `KeyboardAvoidingView` nos formulários de sessão e série, sem cobrir o campo em foco |
| Permissões em runtime | Notificação (API 33+), câmera e microfone (voz) solicitados no momento do uso, com recusa tratada e alternativa manual |
| Tela dividida eOrientation | Layout utilizável em modo multi-janela e com tela deitada bloqueada |
| Tela pequena | Layout sem corte em 5" e no limite de 320 dp de largura |
| Toque | Alvo mínimo de 48 dp em toda ação durante o treino |
| Sem dependência de iOS | Nenhum fluxo pode exigir gesture ou API exclusive de iOS |

---

## 16. Testes

### 16.1 Backend

- Testes unitários de volume, 1RM e detecção de recordes.
- Testes de serviço para criação, pausa e finalização de sessão.
- Testes de integração com PostgreSQL via Testcontainers.
- Testes de autorização impedindo leitura e escrita cruzada entre usuários.
- Testes de validação de DTOs inválidos.
- Testes de idempotência: requisição repetida não duplica série.
- Testes de migração do banco (Flyway up/down).
- Testes de timeout e falha do serviço de IA (mock do provedor).

### 16.2 Mobile

- Testes de componente do registro de série.
- Testes de navegação e estados de carregamento.
- Testes de tratamento de falha de rede.
- Testes de formulário e validação.
- Testes em diferentes tamanhos de tela e versões de OS.

### 16.3 IA

- Validação de formato e limites das respostas.
- Testes com pedidos ambíguos, fora de escopo e adversários.
- Verificação de que restrições do usuário são respeitadas.
- Verificação de que IDs de exercício inventados são rejeitados.
- Medição de aceitação e edição das sugestões.
- Consistência e custo por chamada.

### 16.4 Critérios de aceite do MVP

- [ ] O usuário cria conta, faz login e recupera acesso.
- [ ] O usuário consulta e filtra o catálogo de exercícios.
- [ ] O usuário cria um programa com dias e exercícios.
- [ ] O usuário inicia uma sessão e registra múltiplas séries.
- [ ] O preenchimento rápido sugere os valores da última sessão.
- [ ] O usuário corrige uma série e o histórico reflete a correção.
- [ ] A sessão finalizada aparece no histórico.
- [ ] Volume, 1RM e recordes são calculados de forma consistente e transacional.
- [ ] Um usuário não consegue ler nem escrever dados privados de outro.
- [ ] Erros de validação aparecem de forma compreensível.
- [ ] A documentação da API (OpenAPI) está disponível.
- [ ] O projeto roda seguindo o README.
- [ ] Os testes essenciais passam no ambiente documentado.

### 16.5 Matriz de validação Android

A matriz é reavaliada a cada release. Não é um checklist de uma vez.

| Dimensão | Cobertura mínima |
|---|---|
| Versão do Android | API 26 (8.0) até a mais recente estável |
| Fabricante | Google Pixel + ao menos um Android de marca (Samsung, Motorola, Xiaomi) |
| Tela | 5" (compacto) e 6.7"+ (notch/punch-hole) |
| Navegação | Gesto de back e botão físico de back |
| Multitarefa | Divisão de tela e retorno do app em background |
| Ciclo de vida | Foreground/background durante uma sessão de treino em andamento |
| Rede | 2G/lenta, offline e reconexão — com fila de sincronização |
| Persistência | Fechar e reabrir o app com sessão em andamento |
| Fontes | Escala de fonte no maior valor do sistema |
| Acessibilidade | TalkBack, contraste e alvo de toque |

**Teste de instrumentação:** não é obrigatório no MVP, mas a instrumentação de
UI com Detox ou Appium é o caminho quando a cobertura de regras de domínio
estabilizar.

### 16.6 Distribuição

- Build em **AAB** via EAS Build ou Gradle local (`./gradlew bundleRelease`).
- Assinatura com chave de upload do Play Console; a chave fica **fora** do
  repositório.
- **Keystore, senhas e `google-services.json` nunca são versionados.**
- Track de teste interno para iteração; produção só depois dos critérios de
  aceite do MVP passarem.

---

## 17. Plano de execução

### Sprint 1 — Fundação

- [ ] Criar repositório Git e estrutura de pastas.
- [ ] Configurar projeto Spring Boot + Maven.
- [ ] Configurar React Native com Expo e TypeScript.
- [ ] Subir PostgreSQL local via Docker Compose.
- [ ] Configurar Flyway, OpenAPI e `.env.example`.
- [ ] Configurar CI com build e testes.
- [ ] Definir convenções de código, branches e escopo do MVP.

### Sprint 2 — Usuários, preferências e exercícios

- [ ] Implementar cadastro, login, refresh e recuperação de acesso.
- [ ] Implementar perfil, preferências e unidades.
- [ ] Criar catálogo seed de exercícios + exercises personalizados.
- [ ] Implementar busca e filtros.
- [ ] Escrever testes de autorização.

### Sprint 3 — Treinos

- [ ] Criar programas, dias e exercícios.
- [ ] Implementar início, pausa e conclusão de sessão.
- [ ] Registrar e corrigir séries, com idempotência.
- [ ] Implementar preenchimento rápido.
- [ ] Consultar histórico paginado.
- [ ] Criar testes de regras de negócio.

### Sprint 4 — Estatísticas e recordes

- [ ] Calcular volume com a regra documentada.
- [ ] Implementar estimativa de 1RM.
- [ ] Implementar detecção transacional de recordes.
- [ ] Exibir dashboard e gráficos por exercício.
- [ ] Validar resultados com dados de teste conhecidos.

### Sprint 5 — IA inicial

- [ ] Integrar API de LLM pelo backend com serviço isolado.
- [ ] Definir esquema de saída estruturada e DTOs de validação.
- [ ] Implementar geração de propostas com validação de IDs e limites.
- [ ] Implementar sugestão de carga baseada em regras.
- [ ] Implementar tela de revisão e salvamento do programa.
- [ ] Aplicar rate limiting, logs seguros e tratamento de falhas.

### Sprint 6 — Qualidade e entrega

- [ ] Ampliar testes de integração e cobertura de regras.
- [ ] Testar na matriz Android definida na [seção 16.5](#165-matriz-de-validação-android).
- [ ] Revisar segurança e privacidade.
- [ ] Revisar acessibilidade.
- [ ] Preparar ambiente de homologação.
- [ ] Gerar AAB assinado e publicar no track de teste do Google Play.
- [ ] Documentar instalação, execução e demonstração.

> As sprints são uma divisão de trabalho sugerida — **não** são estimativa
> garantida de prazo.
>
> O plano cobre **apenas Android** no primeiro ciclo. Nenhuma tarefa de iOS
> aparece nas Sprints 1 a 6.

---

## 18. Git e convenções

### 18.1 Branches

- `main` — versão estável.
- `develop` — integração de funcionalidades.
- `feature/<dominio>-<descricao>` — ex. `feature/workout-session`.

### 18.2 Commits

Formato: `<tipo>(<escopo>): <descrição>`.

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `test` | Testes |
| `docs` | Documentação |
| `refactor` | Refatoração sem mudança de comportamento |
| `chore` | Tarefas de manutenção |

Exemplos:

```text
feat(auth): add user authentication and refresh tokens
feat(workout): implement workout session logging
feat(analytics): calculate personal records transactionally
test(workout): cover volume calculation edge cases
docs(api): document workout session endpoints
fix(workout): prevent duplicate set submissions
```

### 18.3 Regras

- Nunca commitar tokens, senhas, `.env` com credenciais reais ou dados reais de
  usuários.
- Pull request com descrição, testes executados e critérios de aceite vinculados.
- Commits pequenos e focados.

---

## 19. Portfólio

Este projeto demonstra competências relevantes para vagas de desenvolvimento:

- Mobile com React Native, Expo e TypeScript.
- Backend Java com Spring Boot e arquitetura em camadas.
- API REST documentada com OpenAPI.
- Modelagem relacional em PostgreSQL com migrações versionadas.
- Autenticação, autorização e modelagem de segurança.
- Testes unitários e de integração.
- Regras de domínio para histórico, volume, 1RM e recordes.
- Integração de IA com saída estruturada, validação e limites.
- Docker e automação de entrega.
- Sincronização offline e resolução de conflitos.
- Visualização de dados e métricas de produto.

### 19.1 O que o README público deve conter

- Descrição do problema que o aplicativo resolve.
- Funcionalidades **implementadas** e **planejadas**, separadas com clareza.
- Tecnologias utilizadas.
- Capturas de tela reais da versão atual.
- Instruções de instalação e execução.
- Diagrama de arquitetura.
- Exemplos de requisições e respostas da API.
- Testes executados e limitações conhecidas.
- Roadmap atualizado.

> Não descreva recursos planejados como se já estivessem implementados. Esta
> regra também vale para commits e mensagens do repositório.

---

## 20. Decisões pendentes

Resolver **antes** de implementar o item correspondente. Os itens marcados como
bloqueantes travam a sprint indicada.

| # | Decisão | Impacto | Bloqueia |
|---|---|---|---|
| 1 | Fórmula de 1RM (Brzycki vs Epley) e limites de validade | Métrica exibida ao usuário | Sprint 4 |
| 2 | Estratégia de tokens: JWT stateless vs sessão, rotação de refresh | Toda a camada de auth | Sprint 2 |
| 3 | Provedor de LLM e orçamento de uso; política de retenção de prompts | Fase 2 inteira | Sprint 5 |
| 4 | Origem do catálogo seed de exercícios: manual ou importado com licença | Seed do banco | Sprint 2 |
| 5 | Regras de volume para peso corporal, séries sem carga e movimentos isométricos | Cálculo de volume | Sprint 4 |
| 6 | Alvo de hospedagem e implantação (Railway / Render / VPS / cloud) | CI/CD e secrets | Sprint 1 |
| 7 | ~~Primeiro lançamento~~ | **Decidido: Android only** (ver [seção 1.5](#15-plataforma-de-lançamento-android-first)). iOS fica para a fase posterior | — |
| 8 | Escopo da Fase 2: qual subset — geração de treino, sugestão de carga, voz, coaching | Esforço de IA | Sprint 5 |
| 9 | Modalidade de recuperação de acesso: email com token vs link mágico | Fluxo de auth | Sprint 2 |
| 10 | Política de privacidade, termos de uso e retenção de dados | Publicação | Sprint 6 |
| 11 | Escopo da social: quem pode ser amigo, visibilidade padrão, moderação | Fase 3 | — |
| 12 | Nome definitivo e identidade visual | Branding | Sprint 1 |
| 13 | Conta de desenvolvedor Google Play ativa e pipeline de build: EAS Build (nuvem) ou Gradle local | Distribuição e assinatura | Sprint 6 |

> Decisões 1, 2, 3 e 5 são as que mais restringem a implementação — resolva-nas
> antes da Sprint 2.

---

## 21. Próximos passos

1. Criar o repositório `ironmind-ai` e subir a estrutura de pastas da
   [seção 8.3](#83-estrutura-do-repositório).
2. Resolver as decisões pendentes 1, 2, 4 e 6.
3. Subir PostgreSQL local e rodar a primeira migração Flyway.
4. Implementar autenticação e preferências — com testes de autorização.
5. Implementar o fluxo completo de registro de treino (exercício → série →
   sessão → histórico).
6. Implementar volume, 1RM e recordes com testes de casos conhecidos.
7. Construir as telas mobile conectadas à API.
8. Só então integrar a primeira funcionalidade de IA.

---

## Apêndice A — Contratos de API

### A.1 Formato de erro

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

- `code` é estável e serve para tratamento no cliente (i18n).
- `message` é legível por humanos; nunca inclui stack trace, caminho de arquivo
  ou nome de tabela/coluna.
- `traceId` correlaciona a requisição com os logs do servidor.

### A.2 Paginação

```text
GET /api/v1/workout-sessions?page=0&size=20&sort=startedAt,desc&from=2026-01-01&to=2026-10-21
```

```json
{
  "content": [ ... ],
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7,
  "hasNext": true
}
```

`size` máximo: 100.

### A.3 Idempotência

Operações que criam registro aceitam o header:

```text
Idempotency-Key: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
```

- Chave com escopo por usuário + endpoint.
- Requisição repetida com a mesma chave retorna o **mesmo resultado** (HTTP 200
  em vez de 201), sem duplicar registro.
- Conflito: mesma chave com corpo diferente → `409 Conflict`, código
  `IDEMPOTENCY_KEY_REUSED`.

### A.4 Autenticação

```text
Authorization: Bearer <accessToken>
```

Resposta de login:

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "d3f1a...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "id": "...", "name": "...", "email": "...", "role": "USER" }
}
```

### A.5 Códigos de erro de domínio

| Código | HTTP | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Entrada inválida |
| `UNAUTHENTICATED` | 401 | Token ausente, expirado ou inválido |
| `FORBIDDEN` | 403 | Recurso pertence a outro usuário |
| `NOT_FOUND` | 404 | Recurso inexistente **ou** de outro usuário |
| `CONFLICT` | 409 | Estado inconsistente (ex.: finalizar sessão já finalizada) |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Chave repetida com payload diferente |
| `RATE_LIMITED` | 429 | Limite de requisições excedido |
| `AI_UNAVAILABLE` | 503 | Provedor de IA indisponível ou timeout |
| `AI_INVALID_RESPONSE` | 502 | Resposta da IA fora do esquema |

> Recursos de outro usuário retornam **404**, não 403 — não revele a existência
> de dados que o usuário não pode ver.

---

## Apêndice B — Bootstrap do repositório

### B.1 Ordem de criação

1. `git init` + `.gitignore` + `.env.example`.
2. `backend/` — `pom.xml`, classe principal, `application.yml` com profiles
   `local` e `test`.
3. `infra/docker-compose.yml` com `postgres` (porta 5432) e `redis` (opcional).
4. Migração Flyway `V1__baseline.sql` com o schema da
   [seção 10](#10-modelo-de-dados) + seed de exercícios.
5. `mobile/` — `npx create-expo-app` + TypeScript + Expo Router.
6. `docs/API.md`, `docs/DATA-MODEL.md`, `docs/SECURITY.md`.
7. CI: build backend, testes backend, testes mobile, lint.

### B.2 Variáveis de ambiente (`.env.example`)

```text
# Backend
DB_URL=jdbc:postgresql://localhost:5432/ironmind
DB_USER=ironmind
DB_PASSWORD=changeme
JWT_SECRET=change-me-32-bytes-minimum
JWT_TTL_SECONDS=900
LLM_API_KEY=
LLM_MODEL=
LLM_TIMEOUT_MS=15000

# Mobile (publicado no bundle — apenas valores não secretos)
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
```

> `JWT_SECRET` e `LLM_API_KEY` nunca são reais no repositório. O backend falha
> no boot se `JWT_SECRET` estiver no valor padrão.

### B.3 `.gitignore` mínimo

```text
.env
*.local
target/
node_modules/
.expo/
dist/
build/
.idea/
.vscode/
*.keystore
*.jks
```
