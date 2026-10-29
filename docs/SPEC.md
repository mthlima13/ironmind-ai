# IronMind AI — Especificação Técnica do Produto

> **Treine com inteligência. Evolua com dados.**
>
> Documento canônico de visão, requisitos, modelo de dados, API e plano técnico
> para o aplicativo mobile de treinamento físico com inteligência artificial.

| Campo | Valor |
|---|---|
| Nome provisório | IronMind AI |
| Tipo | Aplicativo mobile **Android** (iOS planejado para fase posterior) |
| Stack | React Native + Expo + TypeScript (mobile) · Java + Spring Boot (backend) · MongoDB (dados) |
| Status | Backend implementado com identidade delegada e MongoDB. O app Android existe, mas ainda usa o contrato antigo de autenticação e precisa ser migrado. |
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
  identidade — o owner vem sempre do UUID que o gateway injeta no header depois
  de autenticar a sessão.
- Chave de API de LLM **nunca** vai para o aplicativo mobile nem para o repositório.
- Não descrever recurso planejado como se estivesse implementado.

> **Como funciona hoje:** a autenticação é delegada. O owner vem de uma
> identidade verificada pela infraestrutura, injetada no header `X-User-UUID`
> pelo gateway. O princípio não muda: a identidade **nunca** é aceita do corpo,
> da query string ou de um valor escrito pelo cliente. O backend não autentica
> o canal; a garantia de que o header veio do gateway é premissa da
> infraestrutura. Ver [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md).

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

Gerencia as próprias restrições, programas, sessões, séries, histórico, recordes
e configurações no aplicativo. A conta (nome, e-mail, credencial e encerramento)
pertence ao provedor de identidade, não a este backend.

### 3.2 Criador de programas — fase futura

Publica programas, gerencia descrições e acompanha métricas permitidas pela
plataforma. Qualquer recurso comercial depende de regras próprias de pagamento,
moderação e suporte.

### 3.3 Administrador

Gerencia catálogo de exercícios, denúncias, conteúdo inadequado e configurações
operacionais. O acesso administrativo deve ser restrito, auditável e protegido
por permissões específicas — nunca por um campo booleano no cadastro do provedor
de identidade.

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
| RNF-002 | Nenhuma credencial no backend; a autenticação é delegada ao provedor de identidade | Revisão de rotas e dependências |
| RNF-003 | Autorização por recurso e usuário no backend, inclusive em leituras | Teste de acesso cruzado entre usuários |
| RNF-004 | Validação de entrada no aplicativo **e** na API | Testes de DTO inválido |
| RNF-005 | Acessibilidade: contraste, alvos de toque, alternativas a cor, leitor de tela | Revisão manual + teste de componente |
| RNF-006 | Interface responsiva e adequada a diferentes tamanhos de tela e versões de OS | Testes em simuladores |
| RNF-007 | Mensagens de erro compreensíveis, sem stack trace, segredo ou detalhe interno | Teste de handler de exceção |
| RNF-008 | Testes automatizados cobrindo regras de domínio e endpoints críticos | CI verde |
| RNF-009 | Logs sem credenciais, identidade completa ou dados sensíveis desnecessários | Revisão de config de log |
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
3. O backend monta o contexto pelas restrições ativas e pelo histórico
   relevante. Sem preferências persistidas, usa os padrões documentados
   (objetivo `GENERAL`, experiência `BEGINNER`, 3 dias, catálogo completo).
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

### 6.4 Autenticar e acessar os dados

1. O usuário se autentica no provedor de identidade, pela experiência oferecida
   pelo aplicativo ou pela infraestrutura.
2. O gateway valida a sessão, remove qualquer header de identidade enviado pelo
   cliente e injeta o UUID do titular em `X-User-UUID`.
3. A API lê o UUID, valida o formato e o usa como dono de todo recurso criado ou
   consultado. O corpo da requisição nunca define o dono.
4. Um UUID válido sem dados recebe listas vazias; o primeiro recurso criado já
   pertence a ele. O backend não cria perfil nem guarda nome, e-mail ou senha.
5. O aplicativo não guarda token de API: a credencial de sessão pertence ao
   fluxo do provedor de identidade.

**Recuperação de acesso, troca de senha e encerramento de conta** são
responsabilidade do provedor de identidade. A API não expõe `/auth/*` nem
`/users/me`.

### 6.5 Corrigir um registro
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

**Regra decidida (decisão 5 da [seção 20](#20-decisões-pendentes)):** o volume
considera **apenas carga externa**.

- Série com carga (`weightKg`) e repetições: `carga × repetições`.
- Série sem carga externa (peso corporal, exercício assistido, apenas
  repetições): soma **zero**.
- Movimento isométrico ou medido por tempo: soma **zero**; volume não é a
  métrica adequada para ele.
- A interface não apresenta o volume como "trabalho total" de uma série de peso
  corporal — o número reflete somente a carga externa movimentada.

> **Unidade canônica de armazenamento: quilograma.** O app exibe em `lb` ou `kg`
> conforme a preferência local, convertendo na fronteira de apresentação. O banco
> nunca guarda valor ambíguo.

### 7.3 Estimativa de 1RM

O app exibe uma estimativa de repetição máxima usando a **fórmula de Brzycki**
([decisão 1 da seção 20](#20-decisões-pendentes)):

```
1RM = carga × 36 / (37 − repetições)
```

- A estimativa é produzida apenas para séries de **1 a 10 repetições**.
- Fora desse intervalo, ou sem carga positiva, o backend **não** devolve
  estimativa: a fórmula perde precisão e um número exato daria falsa segurança.
- A estimativa não é medição real e é imprecisa com muitas repetições, em
  exercícios isolados ou com carga subestimada por assistências.

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

### 7.7 Identidade e autorização

**Premissa**

1. A sessão do usuário é autenticada pelo provedor de identidade e pelo gateway.
2. O gateway remove o header de identidade enviado pelo cliente e injeta o UUID
   validado do titular.
3. O backend não valida token, não chama o provedor e não guarda sessão.

**Regras do backend**

1. O UUID vem somente do header configurado (`X-User-UUID` por padrão), em
   formato canônico e com exatamente um valor.
2. Header ausente, vazio, duplicado, concatenado, nulo ou malformado em rota
   privada responde `401 UNAUTHENTICATED` antes de qualquer regra de negócio.
3. O UUID é o `userId` de todos os documentos privados. Não há cadastro,
   provisionamento, `identity_subject` nem tombstone.
4. Um UUID válido sem dados enxerga listas vazias — nunca `401`.
5. Recurso de outro usuário responde `404`, nunca `403`.
6. O serviço não expõe perfil, preferências, exclusão de conta ou qualquer
   endpoint de usuário. Esses fluxos pertencem ao provedor de identidade.

Contrato completo, premissas de infraestrutura e testes de aceitação em
[`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md).

### 7.8 Sessão de treino

**Início**

1. Uma sessão começa `IN_PROGRESS`, com `startedAt` e o dono da sessão.
2. Quando a sessão é iniciada a partir de um dia de programa
   (`programDayId`), o backend **copia os exercícios do dia para a sessão**, na
   mesma ordem, com as metas de séries e repetições. A resposta traz a sessão
   já com os exercícios: o aplicativo não precisa montar a lista.
3. O programa e o dia precisam ser do dono da sessão. Referência alheia
   responde **404**.
4. Uma sessão livre (sem `programDayId`) começa sem exercícios. Os exercícios
   são adicionados um a um durante o treino.

**Exercícios da sessão**

1. O `position` define a ordem de execução.
2. O exercício precisa existir no catálogo; referência inexistente responde
   `422` com o caminho do campo.
3. O mesmo exercício não é adicionado duas vezes na mesma sessão.

**Plano do exercício (snapshot)**

1. Quando a sessão nasce de um dia de programa, o plano do exercício é
   **copiado** para a sessão: séries alvo, faixa de repetições e descanso.
2. O plano é um **snapshot**: editar o programa depois **não** muda as sessões
   já realizadas.
3. O plano viaja em campos próprios (`targetSets`, `targetRepsMin`,
   `targetRepsMax`, `restSeconds`), para poder ser comparado com o que foi
   executado. As observações guardam também a versão legível do plano
   ("4x6-8 (descanso 150s)").
4. Em treino livre, o exercício é adicionado sem plano e os campos ficam
   nulos.

**Séries**

1. O `setNumber` é atribuído pelo servidor: é a posição da série dentro do
   exercício da sessão. Ele **não** vem do corpo da requisição.
2. `weightKg` é a unidade canônica (kg) e pode ser `null` para peso corporal.
3. `perceivedExertion` é o RPE, de 1 a 10.
4. A chave de idempotência é gravada **na própria série**, em um campo com
   índice único e sparse. É o mecanismo durável: sobrevive a um restart do
   servidor, ao contrário do cache em memória.
5. Corrigir uma série mantém o seu `id` e o seu `setNumber`.

**Estados**

1. `IN_PROGRESS` → `PAUSED` → `IN_PROGRESS` → `COMPLETED` ou `ABANDONED`.
2. Pausar e retomar são livres; concluir e abandonar **não** voltam atrás.
3. Uma sessão `COMPLETED` ou `ABANDONED` é **imutável**: não aceita novas
   séries, nem correção de séries existentes, nem mudança de estado. A tentativa
   responde `409` `CONFLICT`.
4. Concluir preenche `completedAt`.

**Histórico**

1. A listagem é paginada e devolve **somente as sessões do dono**.
2. A ordenação padrão é `startedAt` descendente: a sessão mais recente
   primeiro.
3. A listagem traz os exercícios e as séries embutidas, porque é assim que o
   aplicativo monta a tela de histórico e o preenchimento rápido.


---

## 8. Arquitetura

### 8.1 Visão de alto nível

```text
Aplicativo React Native / Expo
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

Serviços complementares:
- Provedor de identidade e gateway (fora do backend)
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
| **Entity** | Modelo persistido, mapeado por Spring Data MongoDB (`@Document`). |
| **DTO** | Contrato de entrada e saída da API. Nunca expor entidades. |
| **Security** | Leitura da identidade injetada, autorização e configuração de acesso. Não autentica o usuário. |
| **Integration** | Comunicação com serviços externos, incluindo o provedor de LLM. |
| **Validation** | Bean Validation e validações de domínio. |

**Proibições explícitas:**

- Regra de negócio dentro do controller.
- Depender de resposta livre da IA para alterar o banco sem validação.
- Consultar repositório de entidade privada sem escopo de usuário.
- Expor entidade persistida diretamente no JSON de resposta.

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
│   │   │   │   ├── user/          # restrições de lesão (sem conta/perfil)
│   │   │   │   ├── exercise/
│   │   │   │   ├── program/
│   │   │   │   ├── workout/
│   │   │   │   ├── record/
│   │   │   │   ├── analytics/
│   │   │   │   ├── ai/
│   │   │   │   └── common/
│   │   │   └── resources/catalog/exercises.json
│   │   └── test/
│   ├── pom.xml
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   └── mongo/init-replica-set.js
├── tests/integration/     # contrato da API em Python (pytest)
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
- Armazenamento local: SQLite (Expo SQLite) para rascunhos, fila offline e
  preferências do aparelho, como o tema escolhido
- `expo-secure-store` para a credencial de sessão do provedor de identidade
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

- **Java 25** + **Spring Boot 3.5.x**
- **Spring Security** para autorização de rotas (sem autenticação própria)
- **Spring Data MongoDB**
- **Bean Validation**
- **Maven**
- **OpenAPI 3 / springdoc-openapi** para documentação
- Testes: JUnit 5, AssertJ e Mockito — apenas testes unitários; a integração é
  uma suíte de contrato em Python contra a API real

### 9.3 Dados e infraestrutura

- **MongoDB 7** como banco principal, em **replica set de 1 nó** (`rs0`), porque
  o recálculo dos recordes usa transação de múltiplos documentos
- Índices declarados nos documentos e criados no start
- **Docker** + Docker Compose para ambiente local (MongoDB + bootstrap do
  replica set + API + suíte de testes)
- Sem Redis: o backend não guarda sessão, rate limit de identidade ou fila
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

O modelo executável está em [`DATA-MODEL.md`](DATA-MODEL.md). Resumo:

- MongoDB 7, replica set de 1 nó, UUID como `_id` de todas as coleções.
- Referências entre documentos são IDs planos (`userId`, `sessionId`,
  `sessionExerciseId`, `exerciseId`, `programId`, `dayId`), sem `@DBRef` e sem
  embedding. O serviço carrega os relacionados em lote.
- Não existem coleções de `users`, `user_preferences`, `refresh_tokens` nem
  `password_reset_tokens`. O dono é o UUID do header.
- Todas as datas são `Instant` em UTC; não há fuso do usuário no banco.

### 10.1 Identidade — fora do banco

O backend não persiste conta. O UUID do titular chega no header `X-User-UUID`,
injetado pelo gateway, e é gravado como `userId` em cada documento privado. Nome,
e-mail, papel, fuso, unidades, objetivo e experiência pertencem ao provedor de
identidade. Ver [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md).

### 10.2 Preferências — fora do banco

Não há `user_preferences`. O contexto de IA usa os padrões documentados
(objetivo `GENERAL`, experiência `BEGINNER`, 3 dias, sem filtro de equipamento).
Unidades e demais preferências são apresentação do cliente ou dado da conta no
provedor de identidade.

### 10.3 Coleções

O detalhe de cada campo está em [`DATA-MODEL.md`](DATA-MODEL.md). Resumo:

| Coleção | Propósito | Dono / referência |
|---|---|---|
| `exercises` | Catálogo global + exercícios personalizados | `createdByUserId` (ausente no catálogo) |
| `workout_programs` | Programa de treino | `userId` |
| `program_days` | Dia do programa | `programId` |
| `program_exercises` | Exercício dentro do dia, com metas | `programId`, `dayId`, `exerciseId` |
| `workout_sessions` | Sessão realizada | `userId`, `programId`, `programDayId` |
| `session_exercises` | Exercício dentro da sessão | `sessionId`, `exerciseId` |
| `exercise_sets` | Série registrada | `userId`, `sessionId`, `sessionExerciseId`, `exerciseId` |
| `personal_records` | Recorde por usuário/exercício/tipo | `userId`, `exerciseId`, `sourceSetId` |
| `injury_restrictions` | Limitações informadas | `userId`, `exerciseIds[]` |
| `ai_recommendations` | Propostas e sugestões com status | `userId` |

Regras transversais:

- Referências são **IDs planos**, sem `@DBRef` e sem embedding. O serviço carrega
  os relacionados em lote.
- `exercise_sets` guarda `userId` além das referências, para que a consulta não
  dependa de join.
- Unicidade: `(userId, exerciseId, recordType)` em `personal_records`;
  `idempotencyKey` único e sparse em `exercise_sets`.
- `injury_restrictions` guarda os exercícios a evitar em `exerciseIds[]`; não há
  coleção associativa.
- Não há chave estrangeira: a integridade é validada pelo serviço antes de
  gravar.
- Arquivar programa ou excluir dia **nunca** altera sessões já realizadas.


### 10.4 Tokens — fora do banco

Não existem `refresh_tokens` nem `password_reset_tokens`. Sessão, rotação,
revogação e recuperação de acesso pertencem ao provedor de identidade. O backend
não emite, não guarda e não valida token.

### 10.5 Relacionamentos

- Um `userId` possui vários programas, sessões, recordes, restrições e
  recomendações. Não há documento de usuário para referenciar.
- Um programa possui vários dias; cada dia possui vários exercícios ordenados.
- Uma sessão possui vários exercícios realizados; cada um possui várias séries.
- Um exercício aparece em vários programas, dias e sessões.
- Um usuário pode ter vários recordes, um por tipo e exercício.
- Uma recomendação de IA pertence a um usuário e **não altera treino sem
  confirmação**.
- Arquivar programa ou excluir dia não altera sessões já realizadas.

---

## 11. API REST

Prefixo: `/api/v1`. Todas as rotas privadas exigem o header de identidade
`X-User-UUID`, injetado pelo gateway. O contrato completo está em
[`API.md`](API.md).

### 11.1 Identidade e usuário

| Método | Endpoint | Finalidade |
|---|---|---|
| — | — | **Não existe endpoint de autenticação ou de usuário** |

- Cadastro, login, sessão, recuperação de acesso, perfil e exclusão de conta são
  do provedor de identidade.
- `GET /health` e `GET /exercises/**` são públicas; as demais rotas exigem o
  header.
- Header ausente ou inválido em rota privada responde `401 UNAUTHENTICATED`.
- Contrato, premissas do gateway e testes em
  [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md).

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
| `POST` | `/ai/recommendations/{id}/decision` | Registrar aceite, edição ou rejeição |

> A conversa de coaching e a transcrição de voz não são armazenadas. Apenas
> propostas de treino e sugestões de carga viram recomendação persistida, com
> um resumo não sensível do pedido, para registrar a decisão do usuário.

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
- `user_id` **nunca** é lido do corpo da requisição; vem do header de identidade.

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
  "splitType": "PPL",
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

**Divisão do treino:** o usuário escolhe explicitamente a divisão entre
`PPL`, `UPPER_LOWER`, `FULL_BODY`, `AB`, `ABC`, `ABCD`, `ABCDE`, `ARNOLD_SPLIT`,
`PHUL` e `HYBRID_PPL_UPPER_LOWER`, ou deixa `CUSTOM` para um arranjo próprio. Não
existe modo aleatório. A opção "IA escolhe" deixa a decisão para o modelo, que
deve justificá-la pelo número de dias, objetivo, experiência e histórico. A
escolha do usuário sempre prevalece sobre a sugestão do modelo; sem escolha e sem
sugestão válida, a proposta é classificada como `CUSTOM`.

**Dias × divisão:** a divisão descreve a estrutura, então o número de dias tem
que caber nela. Um programa com dias informados só é aceito quando o total bate
com a divisão:

| Divisão | Dias aceitos |
|---|---|
| `AB` | 2 |
| `ABC` | 3 |
| `ABCD` | 4 |
| `ABCDE` | 5 |
| `ARNOLD_SPLIT` | 3 |
| `UPPER_LOWER` | 2 ou 4 |
| `PPL` | 3 ou 6 |
| `PHUL` | 4 |
| `HYBRID_PPL_UPPER_LOWER` | 5 |
| `FULL_BODY` | 1 a 6 |
| `CUSTOM` | qualquer quantidade |

Um programa **sem dias** é um rascunho e é aceito com qualquer divisão; a regra
só vale a partir do primeiro dia. A recusa é `422 VALIDATION_ERROR` com
`fieldErrors` em `days`, e a mensagem informa quantos dias a divisão exige. A
mesma verificação roda no `POST` e no `PUT`, porque os dois substituem a
estrutura inteira.

No app, a criação manual de programa oferece **todas** as divisões acima e só
as quantidades de dias válidas para a escolhida: escolher AB cria os dois dias
("Superior" e "Inferior"), ABCD cria os quatro, e assim por diante. Os dias
nascem sem exercícios e o usuário preenche cada um no editor de dia.

**Fluxo obrigatório:**

1. App envia o pedido em linguagem natural, com a divisão escolhida (opcional).
2. Backend lê o UUID do header de identidade e resolve o owner.
3. Backend monta o contexto: restrições ativas, exercício do catálogo,
   histórico relevante, divisão escolhida e os padrões documentados de objetivo,
   experiência e dias por semana.
4. Serviço de IA chama o LLM com o contexto mínimo necessário.
5. Resposta é desserializada em DTO e validada contra o esquema.
6. Backend verifica: IDs de exercício existem; belong to catálogo; sets e reps
   dentro dos limites configurados; respeita restrições ativas; divisão
   devolvida é uma das divisões suportadas.
7. Referências inválidas são **descartadas ou substituídas**, nunca aceitas.
8. Usuário revisa, edita ou rejeita. A divisão também pode ser trocada antes de
   salvar.
9. Só então o programa é persistido.

> A IA não inventa IDs de exercício e não grava diretamente no banco.

**Implementação atual:**

- O contexto enviado ao modelo é mínimo: padrões de objetivo, experiência e
  dias por semana, região das restrições ativas, catálogo já filtrado, um resumo
  do histórico recente e a divisão escolhida pelo usuário. Texto livre de
  restrições e dado de saúde não são enviados. O serviço não tem preferências
  do usuário: elas pertencem à conta no provedor de identidade.
- A divisão escolhida no pedido prevalece sobre a divisão sugerida pelo modelo.
  Quando o usuário deixa "IA escolhe", o provedor simulado deriva a divisão de
  forma determinística a partir do número de dias; não há sorteio.
- A proposta validada é gravada como recomendação `PENDING`, junto de um resumo
  não sensível do pedido. O texto do prompt não é armazenado.
- O programa em si continua sendo criado por `POST /programs`, com o payload
  revisado pelo usuário. A recomendação é vinculada ao programa salvo por
  `POST /ai/recommendations/{id}/decision`.
- `ACCEPTED`, `EDITED` e `REJECTED` registram a decisão do usuário; uma
  recomendação já revisada responde `409`.

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

**Implementação atual:** a sugestão é calculada por regras no backend, a partir
das sessões concluídas:

| Regra | Condição |
|---|---|
| `INSUFFICIENT_HISTORY` | não há sessão concluída com o exercício; nenhuma carga é sugerida |
| `REDUCE` | última sessão com RPE ≥ 9 ou abaixo do mínimo de repetições |
| `INCREASE` | ao menos 3 sessões, topo da faixa nas 2 últimas e RPE ≤ 8 em todas |
| `KEEP` | nenhuma das anteriores: repete carga e séries da última sessão |

O incremento é de 2,5 kg a partir de 20 kg e de 1 kg abaixo disso. A sugestão
traz a regra e a explicação que a originaram, nunca é aplicada automaticamente
(`applied: false`) e a decisão do usuário é registrada pelo endpoint de decisão.
Exercício de outro usuário responde `404`; exercício bloqueado por restrição
ativa responde `422`.

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

> **Estado atual (Sprint 3):** os itens 1 a 5 e 7 estão implementados no app
> (`mobile/src/services/offlineSync.ts`): a fila é reenviada em ordem quando o
> backend volta, com o `Idempotency-Key` original, e o banner mostra pendências
> e falhas. A **resolução de conflitos** (item 6 e [seção 13.2](#132-regras-de-conflito))
> não foi implementada: não há edição offline simultânea, a primeira gravação
> válida vence e uma rejeição definitiva fica marcada como `ERROR`.

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

### 14.1 Identidade e autorização

- HTTPS obrigatório em ambientes publicados.
- **Sem autenticação no backend:** JWT, senha, refresh token, recuperação de
  acesso e Redis foram removidos. O serviço não emite, guarda ou valida
  credencial.
- **Identidade delegada:** o gateway autentica a sessão e injeta o UUID do
  titular em `X-User-UUID`; o backend valida formato e unicidade do header.
- Header ausente, vazio, duplicado, concatenado ou malformado em rota privada
  responde `401 UNAUTHENTICATED` antes de qualquer regra de negócio.
- **Autorização** aplicada em **todos** os endpoints privados, inclusive leitura.
  O UUID do header é o dono; o backend nunca confia em `user_id` do corpo da
  requisição.
- Recurso de outro usuário responde `404`, nunca `403`.
- Um UUID válido sem dados recebe listas vazias; o serviço não provisiona
  usuário, não guarda perfil e não expõe exclusão de conta.
- **Rate limiting** na borda (gateway) é responsabilidade da infraestrutura; o
  backend limita apenas as chamadas de IA.

### 14.2 Dados e abuso

- Rate limiting em todos os endpoints de IA (10 requisições/60 s por usuário, por
  padrão, e cota diária de 50).
- Validação de arquivos enviados: formato, tamanho e verificação de conteúdo.
- Proteção de fotos e dados corporais com acesso privado e URLs assinadas.
- CORS restrito às origens do aplicativo publicado.
- CSP e headers de segurança no serviço de API.

### 14.3 Privacidade

- Coletar o mínimo de dados pessoais necessário.
- Consentimento explícito para dados de saúde, restrições e fotos.
- Permitir que o usuário compreenda, **exporte** e solicite a **exclusão** dos
  seus dados.
  - **Exclusão:** fora do backend. O provedor de identidade encerra a conta e o
    edge (ou uma rotina administrativa) remove os documentos pelo `userId`. O
    serviço não expõe `DELETE /users/me` nem mantém tombstone; bloquear a
    recriação da conta é papel do IdP. Ver
    [`DATA-MODEL.md` §8](DATA-MODEL.md#8-exclusão-dos-dados-do-titular).
  - **Exportação:** ainda não implementada.
- Definir retenção e exclusão de dados sensíveis e de recomendações de IA.
  - Os rascunhos de política de privacidade e termos estão em
    [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md); **não foram revisados
    juridicamente nem publicados**.
- Proteger dados locais no dispositivo e limpar rascunhos no encerramento da
  sessão.
  - O logout no provedor de identidade limpa a credencial de sessão; a fila
    offline e o cache de consultas do app são limpos ao sair.

### 14.4 Conformidade

- Revisar obrigações da **LGPD** antes de publicar o produto.
- Atender à política do **Google Play** para o primeiro lançamento:
  - `targetSdkVersion` 35 ou superior.
  - Formato de distribuição **AAB**.
  - Formulário *Data Safety* preenchido e coerente com a coleta real.
  - URL de política de privacidade publicada.
  - Opção de exclusão de conta acessível dentro do app (exigência do Play para
    apps que criam conta). **Fora do backend** — a exclusão é executada pelo
    provedor de identidade/edge; falta a URL web de solicitação exigida pelo
    formulário *Data Safety*.
  - Classificação de conteúdo e declaração de anúncios.
- Criar política de privacidade e termos de uso antes do lançamento público.
  Rascunhos em [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md), pendentes de
  revisão jurídica e publicação.
- Checklist de conta, keystore, AAB e *Data Safety* em
  [`PLAY-RELEASE.md`](PLAY-RELEASE.md).
- Criar política de denúncia, bloqueio e moderação **antes** de liberar recursos
  sociais.
- A conformidade com a App Store fica como requisito da fase de iOS.

### 14.5 Segredos e infraestrutura

- Segredos em variáveis de ambiente ou gerenciador de segredos.
- `.env` com credenciais reais **nunca** versionado — apenas `.env.example`.
- Logging sem tokens, conteúdo corporal ou chats completos.

---

## 15. Interface e navegação

### 15.1 Abas principais

1. **Início:** resumo do dia e acesso rápido ao treino.
2. **Treinos:** programas, dias, divisão atual, criação manual de programa por
   divisão (AB, ABC, ABCD, corpo inteiro, upper/lower, entre outras) e catálogo
   de exercícios.
3. **Começar treino:** sessão ativa, registro de séries e descanso.
4. **Evolução:** gráficos, volume, recordes e histórico.
5. **Perfil:** preferências, restrições, privacidade e configurações.

> O chat de IA continua acessível a partir de **Evolução**, para receber
> contexto relevante sem sobrecarregar a navegação principal. A aba Treinos não
> tem entrada de IA.

### 15.2 Direção visual

- Dois temas selecionáveis pelo usuário em **Perfil → Aparência**: **Claro** e
  **Escuro**, além de **Sistema**, que segue a configuração do Android.
- Tema **escuro** (padrão): fundo grafite com verde-limão como cor de destaque.
- Tema **claro**: fundo branco, superfícies claras e o mesmo verde-limão em um
  tom mais escuro, para manter o contraste do texto e dos botões.
- A escolha do tema é local do aparelho: não é enviada à API e persiste entre
  sessões. Trocar o tema não recria a conta nem o histórico.
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
| Tela dividida e orientação | Layout utilizável em modo multi-janela e com tela deitada bloqueada |
| Tela pequena | Layout sem corte em 5" e no limite de 320 dp de largura |
| Toque | Alvo mínimo de 48 dp em toda ação durante o treino |
| Sem dependência de iOS | Nenhum fluxo pode exigir gesture ou API exclusive de iOS |

---

## 16. Testes

### 16.1 Backend

- Testes **unitários** de volume, 1RM e detecção de recordes.
- Testes de serviço para criação, pausa e finalização de sessão.
- Testes do filtro de identidade: header ausente, duplicado, concatenado,
  malformado, nulo e rota pública.
- Testes de validação de DTOs inválidos.
- Testes de idempotência: requisição repetida não duplica série.
- Testes de timeout e falha do serviço de IA (mock do provedor).

Não há teste de integração em JUnit e o backend não usa Testcontainers. A
integração é uma **suíte de contrato em Python** (`tests/integration/`) que roda
contra a API real do `docker compose`: isolamento entre usuários, paginação,
idempotência, recordes transacionais, analytics e IA.

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

- [x] O usuário acessa a API com a identidade injetada pelo gateway.
- [x] O usuário consulta e filtra o catálogo de exercícios.
- [ ] O usuário cria um programa com dias e exercícios.
  - O backend já expõe `POST /programs`; a tela do app ainda edita o dia em
    memória e não persiste. Falta ligar a interface à API.
- [x] O usuário inicia uma sessão e registra múltiplas séries.
- [x] O preenchimento rápido sugere os valores da última sessão.
- [ ] O usuário corrige uma série e o histórico reflete a correção.
  - O backend já expõe `PATCH /sets/{id}` e `DELETE /sets/{id}`; falta a
    interface no app.
- [x] A sessão finalizada aparece no histórico.
- [x] Volume, 1RM e recordes são calculados de forma consistente e transacional.
  - `/analytics/*` e `/records` usam as calculadoras, e o recálculo dos recordes
    roda na mesma transação da escrita da série.
- [x] Um usuário não consegue ler nem escrever dados privados de outro.
- [x] Erros de validação aparecem de forma compreensível.
- [x] A documentação da API (OpenAPI) está disponível.
- [x] O projeto roda seguindo o README.
- [x] Os testes essenciais passam no ambiente documentado.

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

**Execução parcial registrada (API 35):** emulador Android 15 (API 35, x86_64,
perfil Pixel 6), com o app falando com a API e o banco reais no contrato antigo.
Verificado: navegação entre as cinco abas e leitura do catálogo. **Pendente:**
migrar o app para a identidade injetada pelo gateway, aparelho físico de outra
marca, tela de 5 polegadas, modo multi-janela, TalkBack, escala máxima de fonte
e o ciclo de vida da sessão com o app em background.

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

- [x] Criar repositório Git e estrutura de pastas.
- [x] Configurar projeto Spring Boot + Maven.
- [x] Configurar React Native com Expo e TypeScript.
- [x] Subir MongoDB local via Docker Compose (replica set de 1 nó).
- [x] Configurar OpenAPI, `.env.example` e o seed do catálogo.
- [x] Configurar CI com build e testes.
- [x] Definir convenções de código, branches e escopo do MVP.

### Sprint 2 — Identidade, restrições e exercícios

- [x] Identidade delegada: header `X-User-UUID`, filtro, autorização por dono.
- [x] Remover autenticação local, perfil e preferências do backend.
- [x] Criar catálogo seed de exercícios + exercícios personalizados.
- [x] Implementar restrições de lesão.
- [x] Implementar busca e filtros.
- [x] Escrever testes unitários de autorização e do filtro de identidade.

### Sprint 3 — Treinos

- [x] Criar programas, dias e exercícios.
- [x] Implementar início, pausa e conclusão de sessão.
- [x] Registrar e corrigir séries, com idempotência.
- [x] Implementar preenchimento rápido.
- [x] Consultar histórico paginado.
- [x] Criar testes de regras de negócio.

### Sprint 4 — Estatísticas e recordes

- [x] Calcular volume com a regra documentada.
- [x] Implementar estimativa de 1RM.
- [x] Implementar detecção transacional de recordes.
- [x] Exibir dashboard e gráficos por exercício.
- [x] Validar resultados com dados de teste conhecidos.

### Sprint 5 — IA inicial

- [x] Integrar API de LLM pelo backend com serviço isolado.
- [x] Definir esquema de saída estruturada e DTOs de validação.
- [x] Implementar geração de propostas com validação de IDs e limites.
- [x] Implementar sugestão de carga baseada em regras.
- [x] Implementar tela de revisão e salvamento do programa.
- [x] Aplicar rate limiting, logs seguros e tratamento de falhas.

### Sprint 6 — Qualidade e entrega

- [ ] Ampliar testes de integração e cobertura de regras.
- [ ] Testar na matriz Android definida na [seção 16.5](#165-matriz-de-validação-android).
- [ ] Revisar segurança e privacidade.
- [ ] Revisar acessibilidade.
- [ ] Preparar ambiente de homologação.
- [ ] Gerar AAB assinado e publicar no track de teste do Google Play.
- [ ] Documentar instalação, execução e demonstração.

> **Estado desta rodada:** o backend está completo no novo contrato de
> identidade (sem autenticação própria) e em MongoDB, coberto por testes
> unitários JUnit e pela suíte de contrato em Python. O aplicativo ainda usa o
> contrato antigo (`/auth/*`, `/users/me`): a migração do mobile é o item que
> bloqueia o uso da API real pelo app. A exclusão de conta é do provedor de
> identidade, não do backend.

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
feat(workout): implement workout session logging
feat(analytics): calculate personal records transactionally
test(workout): cover volume calculation edge cases
docs(api): document workout session endpoints
fix(workout): prevent duplicate set submissions
```

### 18.3 Regras

- Nunca commitar credenciais, `.env` com valores reais ou dados reais de
  usuários.
- Pull request com descrição, testes executados e critérios de aceite vinculados.
- Commits pequenos e focados.

---

## 19. Portfólio

Este projeto demonstra competências relevantes para vagas de desenvolvimento:

- Mobile com React Native, Expo e TypeScript.
- Backend Java com Spring Boot e arquitetura em camadas.
- API REST documentada com OpenAPI.
- Modelagem de documentos em MongoDB, índices e transações.
- Identidade delegada, autorização por proprietário e modelagem de segurança.
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
| 1 | ~~Fórmula de 1RM (Brzycki vs Epley) e limites de validade~~ | **Decidido:** Brzycki, `1RM = carga × 36 / (37 − repetições)`, apenas de 1 a 10 repetições (ver [seção 7.3](#73-estimativa-de-1rm)) | — |
| 2 | ~~Estratégia de autenticação~~ | **Decidido:** identidade delegada. O gateway autentica a sessão e injeta `X-User-UUID`; o backend não emite, guarda nem valida token (ver [seção 14.1](#141-identidade-e-autorização) e [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md)) | — |
| 3 | Provedor de LLM e orçamento de uso; política de retenção de prompts | Fase 2 inteira | Sprint 5 |
| 4 | Origem do catálogo seed de exercícios: manual ou importado com licença | Seed do banco | Sprint 2 |
| 5 | ~~Regras de volume para peso corporal, séries sem carga e movimentos isométricos~~ | **Decidido:** o volume soma apenas carga externa (`carga × repetições`); peso corporal, exercício assistido e movimento isométrico somam zero (ver [seção 7.2](#72-volume-de-treino)) | — |
| 6 | Alvo de hospedagem e implantação (Railway / Render / VPS / cloud) | CI/CD e secrets | Sprint 1 |
| 7 | ~~Primeiro lançamento~~ | **Decidido: Android only** (ver [seção 1.5](#15-plataforma-de-lançamento-android-first)). iOS fica para a fase posterior | — |
| 8 | Escopo da Fase 2: qual subset — geração de treino, sugestão de carga, voz, coaching | Esforço de IA | Sprint 5 |
| 9 | ~~Modalidade de recuperação de acesso~~ | **Decidido:** recuperação de acesso, troca de senha e encerramento de conta pertencem ao provedor de identidade; o backend não expõe `/auth/*` | — |
| 14 | ~~Algoritmo de hash de senha~~ | **Resolvido por remoção:** o backend não guarda senha. O hash é responsabilidade do provedor de identidade | — |
| 10 | Política de privacidade, termos de uso e retenção de dados | **Parcial** — rascunhos em [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md); falta revisão jurídica, publicação em URL pública e designação do DPO | Sprint 6 |
| 11 | Escopo da social: quem pode ser amigo, visibilidade padrão, moderação | Fase 3 | — |
| 12 | Nome definitivo e identidade visual | Branding | Sprint 1 |
| 13 | Conta de desenvolvedor Google Play ativa e pipeline de build: EAS Build (nuvem) ou Gradle local | **Pendente** — checklist em [`PLAY-RELEASE.md`](PLAY-RELEASE.md); recomendação provisória: EAS Build. Conta, keystore e AAB ainda não existem | Sprint 6 |

> As decisões 1, 2, 5, 7, 9 e 14 já estão resolvidas. A **2** e a **9** foram
> resolvidas pela remoção da autenticação local: o provedor de identidade cuida
> de login, sessão e recuperação. As que mais restringem o que falta são a **3**
> (provedor de LLM e custo) e a **8** (escopo da Fase 2): resolva-as antes da
> Sprint 5.
>
> As decisões **4** (origem do seed), **6** (hospedagem) e **12** (nome e
> identidade) continuam abertas: as Sprints 1 a 3 foram entregues com soluções
> provisórias (seed escrito no repositório, CI no GitHub Actions e nome de
> trabalho). Confirme essas escolhas antes da publicação.

---

## 21. Próximos passos

1. Migrar o aplicativo mobile para a identidade injetada pelo gateway: remover
   as telas e chamadas de `/auth/*` e `/users/me`, e passar a falar com a API
   real usando o header que a infraestrutura injeta.
2. Ligar ao backend real as telas que ainda usam o adaptador de mock: dashboard,
   evolução por exercício, recordes e catálogo pessoal.
3. Resolver a decisão 3 (provedor de LLM e orçamento) e a 8 (escopo da Fase 2).
4. Integrar a primeira funcionalidade de IA no app, com revisão e decisão do
   usuário.
5. Fechar as pendências de publicação: revisar e publicar a política de
   privacidade e os termos de uso, criar a URL web de solicitação de exclusão,
   abrir a conta de desenvolvedor Google Play, gerar a keystore fora do
   repositório e assinar o AAB.
6. Verificar no ambiente real as premissas de rede do gateway antes de expor o
   serviço — a checagem I2/I3 de
   [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md#52-infraestrutura-ambiente-real--não-é-código-deste-repositório)
   bloqueia produção.

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
  ou nome de coleção/campo.
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

### A.4 Identidade

Toda rota privada exige o header injetado pelo gateway:

```text
X-User-UUID: 3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90
```

- Não há login, `Authorization: Bearer`, access token nem refresh token.
- Header ausente, duplicado, concatenado, nulo ou malformado responde
  `401 UNAUTHENTICATED`.
- Rotas públicas (`/health` e `/exercises/**`) funcionam sem o header.
- Contrato completo em [`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md).

### A.5 Códigos de erro de domínio

| Código | HTTP | Significado |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Entrada inválida |
| `UNAUTHENTICATED` | 401 | Header de identidade ausente ou inválido em rota privada |
| `FORBIDDEN` | 403 | Operação proibida (reservado: recurso de outro usuário responde `404`) |
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
3. `infra/docker-compose.yml` com `mongo` (replica set `rs0`), `mongo-init`,
   `api` e `tests`.
4. Seed do catálogo em `backend/src/main/resources/catalog/exercises.json`,
   inserido de forma idempotente por nome.
5. `mobile/` — `npx create-expo-app` + TypeScript + Expo Router.
6. `docs/API.md`, `docs/DATA-MODEL.md`, `docs/SECURITY.md`,
   `docs/AUTH-INTEGRATION.md` e `tests/integration/`.
7. CI: build backend, testes unitários, suíte de contrato em Python, testes
   mobile e lint.

### B.2 Variáveis de ambiente (`.env.example`)

```text
# Backend
MONGODB_URI=mongodb://ironmind:changeme@localhost:27017/ironmind?authSource=admin&replicaSet=rs0
USER_UUID_HEADER=X-User-UUID
CORS_ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
LLM_PROVIDER=mock
LLM_API_KEY=
LLM_MODEL=
LLM_TIMEOUT_MS=15000

# Compose (credenciais de desenvolvimento)
MONGO_INITDB_ROOT_USERNAME=ironmind
MONGO_INITDB_ROOT_PASSWORD=changeme
MONGO_PORT=27017
BACKEND_PORT=8080

# Mobile (publicado no bundle — apenas valores não secretos)
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
```

> `MONGO_INITDB_ROOT_PASSWORD` e `LLM_API_KEY` nunca são reais no repositório.
> Use `MONGO_PORT=27018` se a porta 27017 já estiver ocupada por um MongoDB
> local.

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
