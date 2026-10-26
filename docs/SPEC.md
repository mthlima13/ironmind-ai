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

### 6.4 Criar conta e entrar

1. O usuário preenche nome, e-mail e senha no aplicativo.
2. O aplicativo valida a senha localmente (mínimo de 8 caracteres, uma letra e
   um número) e a API valida as mesmas regras.
3. A API hasheia a senha com Argon2id, cria a conta e as preferências padrão
   em uma única transação.
4. A API emite o access token e um refresh token opaco.
5. O aplicativo guarda os dois tokens no armazenamento seguro do dispositivo.
6. Em uma falha de rede, o aplicativo reenvia a mesma requisição com a mesma
   `Idempotency-Key` e recebe o mesmo resultado, sem criar duas contas.

**Recuperação de acesso:** o usuário informa o e-mail; a API responde sempre da
mesma forma, exista ou não a conta, e emite um token de uso único com 30
minutos de validade, entregue por e-mail.

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
> conforme `user_preferences.preferred_units`, convertendo na fronteira de
> apresentação. O banco nunca guarda valor ambíguo.

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

### 7.7 Conta, senha e tokens

**Cadastro**

1. O e-mail é normalizado: minúsculas e sem espaços nas pontas.
2. O e-mail é único. E-mail já cadastrado responde `409` com o código
   `EMAIL_ALREADY_IN_USE`.
3. A senha é validada (mínimo de 8 caracteres, uma letra e um número) e
   hasheada com Argon2id. A senha em texto puro não é logada nem retornada.
4. A conta, as preferências padrão e a primeira família de refresh tokens são
   criadas na **mesma transação**. Se qualquer passo falhar, nada é gravado.
5. O cadastro aceita `Idempotency-Key`: reenviar a mesma requisição devolve a
   mesma conta, sem duplicar.

**Login**

1. E-mail inexistente e senha errada devolvem a **mesma** resposta (`401`
   `INVALID_CREDENTIALS`), sem revelar se o e-mail existe.
2. Um login bem-sucedido cria uma nova família de refresh tokens.
3. O login é limitado por taxa, por IP e por e-mail.

**Renovação**

1. O refresh token apresentado precisa existir, não estar revogado e não estar
   expirado.
2. A renovação emite um token novo, revoga o antigo e aponta o antigo para o
   novo (`replaced_by_token_id`).
3. **Apresentar um token já revogado revoga a família inteira** e devolve
   `401`. É a resposta a um token roubado usado duas vezes.
4. Tokens expirados são revogados no momento do uso.

**Recuperação de acesso**

1. A resposta é genérica e igual exista ou não a conta.
2. O token tem uso único: depois de usado, `used_at` é preenchido e ele não
   funciona mais.
3. Usar o token **revoga todos os refresh tokens** do usuário: recuperar a
   senha encerra as sessões abertas.
4. O token expira em 30 minutos.

**Logout**

1. Revoga o refresh token apresentado.
2. É idempotente: revogar um token já revogado não é erro.

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
3. O plano viaja em colunas próprias (`target_sets`, `target_reps_min`,
   `target_reps_max`, `rest_seconds`), para poder ser comparado com o que foi
   executado. As observações guardam também a versão legível do plano
   ("4x6-8 (descanso 150s)").
4. Em treino livre, o exercício é adicionado sem plano e os campos ficam
   nulos.

**Séries**

1. O `setNumber` é atribuído pelo servidor: é a posição da série dentro do
   exercício da sessão. Ele **não** vem do corpo da requisição.
2. `weightKg` é a unidade canônica (kg) e pode ser `null` para peso corporal.
3. `perceivedExertion` é o RPE, de 1 a 10.
4. A chave de idempotência é gravada **na própria série**, em uma coluna com
   índice único. É o mecanismo durável: sobrevive a um restart do servidor, ao
   contrário do cache em memória.
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

- **Java 25** + **Spring Boot 3.5.x**
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
| `split_type` | varchar | `PPL`, `UPPER_LOWER`, `FULL_BODY`, `ABCDE`, `ABC`, `ARNOLD_SPLIT`, `PHUL`, `HYBRID_PPL_UPPER_LOWER`, `CUSTOM` |
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
| `target_sets` | int | nullable — séries planejadas no dia do programa |
| `target_reps_min` | int | nullable — limite inferior das repetições planejadas |
| `target_reps_max` | int | nullable — limite superior das repetições planejadas |
| `rest_seconds` | int | nullable — descanso entre as séries planejadas |

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

### 10.14 `refresh_tokens`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | cascade delete |
| `family_id` | UUID | tokens da mesma sessão de login; a detecção de reuso revoga a família inteira |
| `token_hash` | char(64) unique | SHA-256 hexadecimal do token opaco |
| `expires_at` | timestamptz | |
| `created_at` | timestamptz | |
| `revoked_at` | timestamptz | nullable |
| `replaced_by_token_id` | UUID FK → refresh_tokens | nullable; token que substituiu este |

> O token em texto puro **nunca** é gravado. O índice único em `token_hash`
> permite a busca por hash sem varrer a tabela.

### 10.15 `password_reset_tokens`

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | cascade delete |
| `token_hash` | char(64) unique | SHA-256 hexadecimal |
| `expires_at` | timestamptz | 30 minutos |
| `used_at` | timestamptz | nullable — token de uso único |
| `created_at` | timestamptz | |

### 10.16 Relacionamentos

- Um usuário possui vários programas, sessões, preferências e restrições.
- Um programa possui vários dias; cada dia possui vários exercícios ordenados.
- Uma sessão possui vários exercícios realizados; cada um possui várias séries.
- Um exercício aparece em vários programas, dias e sessões.
- Um usuário pode ter vários recordes, um por tipo e exercício.
- Uma recomendação de IA pertence a um usuário e **não altera treino sem
  confirmação**.
- Um usuário possui vários refresh tokens, um por sessão de login; os tokens de
  uma sessão compartilham a mesma `family_id`.
- Um usuário pode ter vários tokens de recuperação de acesso, todos de uso
  único.

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
`PPL`, `UPPER_LOWER`, `FULL_BODY`, `ABCDE`, `ABC`, `ARNOLD_SPLIT`, `PHUL` e
`HYBRID_PPL_UPPER_LOWER`. Não existe modo aleatório. A opção "IA escolhe" deixa
a decisão para o modelo, que deve justificá-la pelo número de dias, objetivo,
experiência e histórico. A escolha do usuário sempre prevalece sobre a sugestão
do modelo; sem escolha e sem sugestão válida, a proposta é classificada como
`CUSTOM`.

**Fluxo obrigatório:**

1. App envia o pedido em linguagem natural, com a divisão escolhida (opcional).
2. Backend autentica e resolve o owner a partir da sessão.
3. Backend monta o contexto: preferências, experiência, equipamentos,
   restrições ativas, exercício do catálogo, histórico relevante e divisão
   escolhida.
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

- O contexto enviado ao modelo é mínimo: preferências, experiência,
  equipamentos, região das restrições ativas, catálogo já filtrado, um resumo
  do histórico recente e a divisão escolhida pelo usuário. Texto livre de
  restrições e dado de saúde não são enviados.
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

### 14.1 Autenticação e autorização

- HTTPS obrigatório em ambientes publicados.
- **Senhas com Argon2id**, parâmetros OWASP (m = 19 MiB, t = 2, p = 1, saída
  de 32 bytes, salt de 16 bytes). A senha em texto puro nunca é gravada, logada
  nem comparada diretamente.
- **Política de senha:** mínimo de 8 caracteres, ao menos uma letra e ao menos
  um número. A mesma regra roda no aplicativo (feedback imediato) e na API
  (garantia do contrato) — as duas implementações não podem divergir.
- **Access token:** JWT stateless, 15 minutos, com `sub`, `email`, `role` e
  `tokenType=access`.
- **Refresh token:** valor **opaco** de 256 bits, aleatório, nunca um JWT. É
  uma credencial, não um documento: por isso o servidor não precisa confiar em
  nenhuma claim dele.
  - Armazenado **apenas como hash SHA-256** no banco. O valor em texto puro
    existe no cliente e na resposta de login, e em nenhum outro lugar.
  - Validade de 30 dias, **rotativo**: cada renovação emite um token novo e
    revoga o anterior.
  - **Detecção de reuso:** apresentar um token já revogado revoga a família
    inteira de tokens da sessão. Um token roubado e usado duas vezes derruba a
    sessão, em vez de dar acesso silencioso.
  - `logout` revoga o token apresentado.
- **Recuperação de acesso:** token de uso único, 30 minutos de validade, com o
  valor armazenado apenas como hash. A resposta HTTP é **sempre genérica**,
  exista ou não o e-mail — a API não confirma se um e-mail está cadastrado.
- **Autorização** aplicada em **todos** os endpoints privados, inclusive leitura.
- O token carrega `userId` e `role`; o backend nunca confia em `user_id` do
  corpo da requisição.
- **Rate limiting** nos endpoints de autenticação e de recuperação de acesso,
  por IP e por e-mail.

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
  - **Exclusão:** implementada como hard delete em `DELETE /users/me`, com a
    senha atual como segunda prova de titularidade e cascata em todos os dados
    do usuário (ver [API.md](API.md#exclusão-da-conta)). O e-mail fica livre
    para um novo cadastro.
  - **Exportação:** ainda não implementada.
- Definir retenção e exclusão de dados sensíveis e de recomendações de IA.
  - Os rascunhos de política de privacidade e termos estão em
    [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md); **não foram revisados
    juridicamente nem publicados**.
- Proteger dados locais no dispositivo e limpar rascunhos no logout.
  - O logout e a exclusão de conta limpam tokens e a fila offline; a exclusão
    também limpa o cache de consultas do app.

### 14.4 Conformidade

- Revisar obrigações da **LGPD** antes de publicar o produto.
- Atender à política do **Google Play** para o primeiro lançamento:
  - `targetSdkVersion` 35 ou superior.
  - Formato de distribuição **AAB**.
  - Formulário *Data Safety* preenchido e coerente com a coleta real.
  - URL de política de privacidade publicada.
  - Opção de exclusão de conta acessível dentro do app (exigência do Play para
    apps que criam conta). **Implementado** em `DELETE /users/me` e na tela de
    Perfil; falta a URL web de solicitação exigida pelo formulário *Data
    Safety*.
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

- [x] O usuário cria conta, faz login e recupera acesso.
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
- [ ] Volume, 1RM e recordes são calculados de forma consistente e transacional.
  - As calculadoras de volume e 1RM existem e têm teste, mas ainda não são
    usadas por nenhum endpoint; a detecção de recordes não foi implementada.
    Item da Sprint 4.
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
perfil Pixel 6), com o app falando com a API e o banco reais. Verificado:
cadastro pela interface, navegação entre as cinco abas, leitura do catálogo e
do perfil vinda do backend, e o comportamento de erro das telas que dependem
de endpoints das Sprints 3 e 4. **Pendente:** aparelho físico de outra marca,
tela de 5 polegadas, modo multi-janela, TalkBack, escala máxima de fonte e o
ciclo de vida da sessão com o app em background.


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
- [x] Subir PostgreSQL local via Docker Compose.
- [x] Configurar Flyway, OpenAPI e `.env.example`.
- [x] Configurar CI com build e testes.
- [x] Definir convenções de código, branches e escopo do MVP.

### Sprint 2 — Usuários, preferências e exercícios

- [x] Implementar cadastro, login, refresh e recuperação de acesso.
- [x] Implementar perfil, preferências e unidades.
- [x] Criar catálogo seed de exercícios + exercises personalizados.
- [x] Implementar busca e filtros.
- [x] Escrever testes de autorização.

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

> **Entregue nesta rodada:** exclusão de conta in-app (API, tela, testes),
> rascunhos de política de privacidade e termos de uso, checklist de
> publicação em [`PLAY-RELEASE.md`](PLAY-RELEASE.md) e o fechamento das
> pendências funcionais do app: pausar/retomar/abandonar sessão, corrigir e
> excluir séries, persistir a edição manual de um dia do programa
> (`PUT /programs/{id}`) e criar exercícios personalizados, tudo coberto por
> testes do adaptador mock. Os itens da lista acima continuam abertos: a
> matriz Android, o AAB assinado e a publicação no Play dependem de aparelho
> físico, keystore e conta de desenvolvedor.

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
| 1 | ~~Fórmula de 1RM (Brzycki vs Epley) e limites de validade~~ | **Decidido:** Brzycki, `1RM = carga × 36 / (37 − repetições)`, apenas de 1 a 10 repetições (ver [seção 7.3](#73-estimativa-de-1rm)) | — |
| 2 | ~~Estratégia de tokens~~ | **Decidido:** access token JWT stateless de 15 min + refresh token opaco rotativo com detecção de reuso (ver [seção 14.1](#141-autenticação-e-autorização)). Revogação persistida em banco | — |
| 3 | Provedor de LLM e orçamento de uso; política de retenção de prompts | Fase 2 inteira | Sprint 5 |
| 4 | Origem do catálogo seed de exercícios: manual ou importado com licença | Seed do banco | Sprint 2 |
| 5 | ~~Regras de volume para peso corporal, séries sem carga e movimentos isométricos~~ | **Decidido:** o volume soma apenas carga externa (`carga × repetições`); peso corporal, exercício assistido e movimento isométrico somam zero (ver [seção 7.2](#72-volume-de-treino)) | — |
| 6 | Alvo de hospedagem e implantação (Railway / Render / VPS / cloud) | CI/CD e secrets | Sprint 1 |
| 7 | ~~Primeiro lançamento~~ | **Decidido: Android only** (ver [seção 1.5](#15-plataforma-de-lançamento-android-first)). iOS fica para a fase posterior | — |
| 8 | Escopo da Fase 2: qual subset — geração de treino, sugestão de carga, voz, coaching | Esforço de IA | Sprint 5 |
| 9 | ~~Modalidade de recuperação de acesso~~ | **Decidido:** token de uso único de 30 min, resposta genérica anti-enumeração, entrega por porta de e-mail plugável (ver [seção 14.1](#141-autenticação-e-autorização)) | — |
| 14 | ~~Algoritmo de hash de senha~~ | **Decidido:** Argon2id com parâmetros OWASP. BCrypt aceitável como alternativa | — |
| 10 | Política de privacidade, termos de uso e retenção de dados | **Parcial** — rascunhos em [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md); falta revisão jurídica, publicação em URL pública e designação do DPO | Sprint 6 |
| 11 | Escopo da social: quem pode ser amigo, visibilidade padrão, moderação | Fase 3 | — |
| 12 | Nome definitivo e identidade visual | Branding | Sprint 1 |
| 13 | Conta de desenvolvedor Google Play ativa e pipeline de build: EAS Build (nuvem) ou Gradle local | **Pendente** — checklist em [`PLAY-RELEASE.md`](PLAY-RELEASE.md); recomendação provisória: EAS Build. Conta, keystore e AAB ainda não existem | Sprint 6 |

> As decisões 1, 2, 5, 7, 9 e 14 já estão resolvidas. As que mais restringem o
> que falta são a **3** (provedor de LLM e custo) e a **8** (escopo da Fase 2):
> resolva-as antes da Sprint 5.
>
> As decisões **4** (origem do seed), **6** (hospedagem) e **12** (nome e
> identidade) continuam abertas: as Sprints 1 a 3 foram entregues com soluções
> provisórias (seed escrito no repositório, CI no GitHub Actions e nome de
> trabalho). Confirme essas escolhas antes da publicação.

---

## 21. Próximos passos

1. Implementar volume, 1RM e recordes com testes de casos conhecidos e expor
   `/analytics/*` e `/records` (Sprint 4).
2. Ligar ao backend real as telas que ainda usam o adaptador de mock: dashboard,
   evolução por exercício e recordes.
3. Completar as telas pendentes do MVP: persistir a edição de programa,
   corrigir/excluir série, pausar/retomar/abandonar sessão e criar exercício
   personalizado.
4. Resolver a decisão 3 (provedor de LLM e orçamento) e a 8 (escopo da Fase 2).
5. Integrar a primeira funcionalidade de IA.
6. Fechar as pendências de publicação: revisar e publicar a política de
   privacidade e os termos de uso, criar a URL web de solicitação de exclusão,
   abrir a conta de desenvolvedor Google Play, gerar a keystore fora do
   repositório e assinar o AAB. A exclusão de conta in-app já está implementada.

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
| `EMAIL_ALREADY_IN_USE` | 409 | E-mail já cadastrado |
| `INVALID_CREDENTIALS` | 401 | E-mail ou senha inválidos |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token expirado, revogado ou reutilizado |
| `INVALID_RESET_TOKEN` | 401 | Token de recuperação inválido, usado ou expirado |
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
