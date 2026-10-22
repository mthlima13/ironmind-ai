# IronMind AI --- Especificação do Projeto

> **Treine com inteligência. Evolua com dados.**\
> Documento inicial de produto e desenvolvimento para um aplicativo
> fitness com registro de treinos, recomendações por IA, análise de
> desempenho e recursos sociais.

-   **Nome provisório:** IronMind AI
-   **Tipo:** Aplicativo mobile para Android e iOS
-   **Público-alvo:** Pessoas que praticam musculação e outras
    atividades físicas
-   **Objetivo:** Facilitar o registro dos treinos e ajudar o usuário a
    acompanhar seu progresso com recomendações personalizadas e
    explicáveis.
-   **Status:** Planejamento inicial --- nome, arquitetura e
    funcionalidades podem ser ajustados.

------------------------------------------------------------------------

## 1. Visão geral

O IronMind AI será um aplicativo de treinamento que reúne registro de
exercícios, histórico de desempenho, planejamento de rotinas,
inteligência artificial e comunidade fitness em uma única plataforma.

O aplicativo deverá permitir que o usuário registre uma sessão de treino
com poucos toques, acompanhe cargas e repetições, visualize recordes
pessoais e receba sugestões baseadas em seu histórico. A IA poderá
transformar pedidos em linguagem natural em propostas de treino
estruturadas, sempre sujeitas à validação do sistema e à revisão do
usuário.

O produto será desenvolvido por etapas. A primeira versão priorizará uma
experiência de treino funcional, persistência confiável dos dados e uma
API bem estruturada. Recursos avançados, como análise de fotos
corporais, integração com dispositivos de saúde e marketplace de
criadores, serão planejados para fases posteriores.

## 2. Objetivos do produto

-   Tornar o registro de séries rápido e simples.
-   Centralizar o histórico de musculação e outras atividades.
-   Ajudar o usuário a compreender tendências de desempenho.
-   Sugerir cargas e repetições usando dados anteriores, sem prometer
    resultados.
-   Gerar propostas de treino por meio de linguagem natural.
-   Identificar recordes pessoais automaticamente.
-   Permitir evolução futura para recursos sociais, gamificação e
    integrações.
-   Demonstrar competências de desenvolvimento mobile, backend, banco de
    dados, testes, segurança e integração com IA.

## 3. Escopo por fase

### Fase 1 --- MVP

Funcionalidades essenciais para uma primeira versão utilizável:

-   Cadastro, login e gerenciamento básico de perfil.
-   Catálogo inicial de exercícios.
-   Criação e edição de programas de treino.
-   Início, pausa e finalização de sessões.
-   Registro de séries, carga, repetições e observações.
-   Preenchimento rápido usando dados da última sessão.
-   Histórico de treinos realizados.
-   Detecção de recordes pessoais básicos.
-   Dashboard com resumo de atividade.
-   API REST documentada.
-   Testes automatizados para regras de negócio importantes.

### Fase 2 --- Inteligência artificial

-   Geração de proposta de treino a partir de texto.
-   Sugestão de carga e repetições com base no histórico.
-   Chat de orientação sobre os dados registrados.
-   Registro por voz com confirmação quando a transcrição for ambígua.
-   Explicação das recomendações e possibilidade de aceitar, editar ou
    rejeitar.

### Fase 3 --- Comunidade e gamificação

-   Perfil público opcional.
-   Amizades e equipes (Crews).
-   Publicações de treinos e conquistas.
-   Reações e comentários.
-   Desafios e rankings semanais.
-   XP e sequências de atividade, com regras transparentes.
-   Denúncia, bloqueio e controles de privacidade.

### Fase 4 --- Recursos avançados

-   Integrações com plataformas de saúde e relógios compatíveis.
-   Sincronização offline com resolução de conflitos.
-   Registro de cardio, pilates e esportes.
-   Medidas corporais e fotos privadas de progresso.
-   Análise visual assistida por IA, com limitações claramente
    informadas.
-   Programas de criadores e marketplace.
-   Recursos de atividade ao vivo e integração com funcionalidades
    nativas do sistema operacional.

------------------------------------------------------------------------

## 4. Perfis e permissões

### Usuário autenticado

Pode gerenciar o próprio perfil, programas, sessões, séries, histórico,
medidas e preferências de privacidade.

### Criador de programas --- fase futura

Pode publicar programas, gerenciar descrições e acompanhar métricas
permitidas pela plataforma. Recursos comerciais dependem de regras
próprias de pagamento, moderação e suporte.

### Administrador

Pode gerenciar catálogo de exercícios, denúncias, conteúdo inadequado e
configurações operacionais. O acesso administrativo deve ser restrito,
auditável e protegido por permissões específicas.

**Princípio:** um usuário nunca deve acessar ou modificar dados privados
de outro usuário sem uma permissão explícita e validada pelo backend.

------------------------------------------------------------------------

## 5. Requisitos funcionais

  -----------------------------------------------------------------------
  ID                      Requisito               Prioridade
  ----------------------- ----------------------- -----------------------
  RF-01                   Criar conta e           Alta
                          autenticar usuário      

  RF-02                   Visualizar e editar     Alta
                          perfil                  

  RF-03                   Consultar catálogo de   Alta
                          exercícios              

  RF-04                   Criar, editar e         Alta
                          arquivar programas de   
                          treino                  

  RF-05                   Iniciar e finalizar uma Alta
                          sessão de treino        

  RF-06                   Registrar exercício,    Alta
                          série, carga e          
                          repetições              

  RF-07                   Reutilizar valores da   Alta
                          última sessão como      
                          sugestão                

  RF-08                   Consultar histórico de  Alta
                          sessões                 

  RF-09                   Calcular volume e       Alta
                          estimativa de 1RM       

  RF-10                   Detectar recordes       Alta
                          pessoais                

  RF-11                   Gerar dashboard de      Média
                          progresso               

  RF-12                   Gerar proposta de       Média
                          treino por texto usando 
                          IA                      

  RF-13                   Sugerir carga com base  Média
                          no histórico            

  RF-14                   Registrar séries por    Média
                          voz                     

  RF-15                   Informar restrições e   Alta
                          exercícios a evitar     

  RF-16                   Trabalhar offline e     Fase futura
                          sincronizar             
                          posteriormente          

  RF-17                   Criar amizades, equipes Fase futura
                          e publicações           

  RF-18                   Sincronizar dados de    Fase futura
                          saúde de provedores     
                          compatíveis             

  RF-19                   Gerenciar medidas e     Fase futura
                          fotos privadas de       
                          progresso               

  RF-20                   Gerenciar programas     Fase futura
                          publicados por          
                          criadores               
  -----------------------------------------------------------------------

## 6. Requisitos não funcionais

-   **Segurança:** autenticação robusta, autorização por recurso,
    validação de entrada e proteção contra abuso.
-   **Privacidade:** coletar apenas os dados necessários e explicar sua
    finalidade.
-   **Desempenho:** operações comuns de registro devem responder
    rapidamente em condições normais de rede.
-   **Confiabilidade:** impedir perda de sessões e duplicação de séries
    em tentativas repetidas.
-   **Manutenibilidade:** separar controllers, serviços, repositórios,
    entidades e integrações externas.
-   **Testabilidade:** cobrir regras de domínio e endpoints críticos com
    testes automatizados.
-   **Acessibilidade:** garantir contraste, alvos de toque adequados,
    textos claros e suporte a leitores de tela quando possível.
-   **Observabilidade:** registrar erros técnicos sem expor senhas,
    tokens ou dados corporais sensíveis.
-   **Escalabilidade:** permitir evolução gradual de usuários, histórico
    e funcionalidades.
-   **Portabilidade:** manter o backend independente do aplicativo
    cliente por meio de API documentada.

------------------------------------------------------------------------

## 7. Tecnologias recomendadas

### Aplicativo mobile

-   React Native
-   Expo
-   TypeScript
-   React Navigation ou solução de navegação compatível
-   Biblioteca de estado escolhida conforme a complexidade do projeto
-   Armazenamento local para rascunhos e suporte offline futuro

### Backend

-   Java
-   Spring Boot
-   Spring Security
-   Spring Data JPA
-   Bean Validation
-   Maven
-   OpenAPI/Swagger para documentação da API

### Banco de dados e infraestrutura

-   PostgreSQL
-   Flyway para versionamento do schema
-   Docker e Docker Compose para ambiente local
-   Redis opcional em fases futuras, quando houver necessidade
    demonstrada
-   Armazenamento de objetos privado para arquivos, se fotos forem
    implementadas
-   CI/CD para executar build e testes

### Inteligência artificial

-   API de modelo de linguagem (LLM) por meio de um serviço isolado no
    backend.
-   Saída estruturada validada por DTOs e regras de domínio.
-   Limites de uso, tratamento de falhas e controle de custos.
-   Nunca colocar chaves de API no aplicativo mobile ou no repositório.
-   Manter cálculos determinísticos --- como volume, recordes e
    estimativas --- no backend.

### Site e painel administrativo opcionais

Next.js pode ser usado posteriormente para uma landing page, painel
administrativo ou portal de criadores. Não é necessário para o MVP
mobile.

------------------------------------------------------------------------

## 8. Arquitetura sugerida

``` text
ironmind-ai/
├── mobile/
│   ├── src/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── screens/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/main/java/com/ironmind/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── exercise/
│   │   ├── program/
│   │   ├── workout/
│   │   ├── analytics/
│   │   ├── ai/
│   │   ├── restriction/
│   │   └── common/
│   ├── src/main/resources/
│   └── pom.xml
├── infra/
│   └── docker-compose.yml
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   └── SECURITY.md
└── README.md
```

A estrutura é uma referência inicial. Ela poderá ser adaptada conforme o
projeto real e as convenções adotadas no código.

### Responsabilidades por camada

-   **Controller:** recebe requisições HTTP e devolve respostas.
-   **Service:** implementa regras de negócio.
-   **Repository:** consulta e persiste dados.
-   **Entity:** representa o modelo persistido.
-   **DTO:** define os dados de entrada e saída da API.
-   **Security:** autenticação, autorização e configuração de acesso.
-   **Integration:** comunicação com serviços externos, incluindo IA.
-   **Validation:** validações de formato e regras de domínio.

Evitar colocar regras de negócio diretamente nos controllers ou depender
de respostas livres da IA para alterar o banco sem validação.

------------------------------------------------------------------------

## 9. Modelo inicial de dados

### `users`

-   `id` --- UUID, chave primária
-   `name`
-   `email` --- único
-   `password_hash` --- hash seguro; nunca armazenar senha em texto puro
-   `created_at`
-   `updated_at`
-   `timezone`
-   `privacy_settings`

### `exercises`

-   `id` --- UUID
-   `name`
-   `description`
-   `muscle_group`
-   `equipment`
-   `movement_type`
-   `is_system`
-   `created_by_user_id` --- opcional
-   `created_at`

### `workout_programs`

-   `id`
-   `user_id`
-   `name`
-   `description`
-   `split_type` --- por exemplo, Push/Pull/Legs ou Full Body
-   `is_archived`
-   `created_at`
-   `updated_at`

### `program_exercises`

-   `id`
-   `program_id`
-   `exercise_id`
-   `day_order`
-   `exercise_order`
-   `target_sets`
-   `target_reps_min`
-   `target_reps_max`
-   `rest_seconds`
-   `notes`

### `workout_sessions`

-   `id`
-   `user_id`
-   `program_id` --- opcional
-   `started_at`
-   `finished_at` --- opcional
-   `status`
-   `notes`
-   `created_at`

### `session_exercises`

-   `id`
-   `session_id`
-   `exercise_id`
-   `exercise_order`
-   `notes`

### `exercise_sets`

-   `id`
-   `session_exercise_id`
-   `set_number`
-   `weight_kg`
-   `repetitions`
-   `duration_seconds` --- opcional
-   `distance_meters` --- opcional
-   `perceived_effort` --- opcional
-   `completed_at`
-   `created_at`

### `personal_records`

-   `id`
-   `user_id`
-   `exercise_id`
-   `record_type`
-   `value`
-   `unit`
-   `source_set_id`
-   `achieved_at`

### `user_restrictions`

-   `id`
-   `user_id`
-   `description`
-   `restricted_exercise_ids` --- se implementado por relação própria,
    usar tabela associativa
-   `is_active`
-   `created_at`
-   `updated_at`

Restrições podem envolver dados de saúde sensíveis. Devem ser privadas,
opcionais e acessíveis apenas conforme permissões e finalidade
declarada.

### `ai_recommendations`

-   `id`
-   `user_id`
-   `recommendation_type`
-   `input_summary`
-   `output_json`
-   `model_identifier`
-   `status`
-   `created_at`
-   `accepted_at` --- opcional

Evitar guardar conversas completas ou dados sensíveis sem necessidade.
Definir retenção e controles de acesso.

### Relacionamentos principais

-   Um usuário possui vários programas.
-   Um programa possui vários exercícios ordenados.
-   Um usuário possui várias sessões de treino.
-   Uma sessão possui vários exercícios realizados.
-   Cada exercício realizado possui várias séries.
-   Um exercício pode aparecer em vários programas e sessões.
-   Um usuário pode ter vários recordes pessoais.
-   Um usuário pode ter várias restrições informadas.
-   Um usuário pode receber várias recomendações de IA.

**Importante:** preservar o histórico realizado. Alterar um programa não
deve modificar sessões antigas.

------------------------------------------------------------------------

## 10. API REST inicial

Prefixo sugerido: `/api/v1`

  ------------------------------------------------------------------------------------
  Método                  Endpoint                             Finalidade
  ----------------------- ------------------------------------ -----------------------
  POST                    `/auth/register`                     Criar conta

  POST                    `/auth/login`                        Autenticar

  GET                     `/users/me`                          Consultar perfil atual

  PATCH                   `/users/me`                          Atualizar perfil

  GET                     `/exercises`                         Listar e filtrar
                                                               exercícios

  POST                    `/exercises`                         Criar exercício
                                                               personalizado

  GET                     `/programs`                          Listar programas do
                                                               usuário

  POST                    `/programs`                          Criar programa

  GET                     `/programs/{id}`                     Consultar programa

  PUT                     `/programs/{id}`                     Atualizar programa

  DELETE                  `/programs/{id}`                     Arquivar ou excluir
                                                               conforme a política
                                                               definida

  POST                    `/workout-sessions`                  Iniciar sessão

  GET                     `/workout-sessions/{id}`             Consultar sessão

  POST                    `/workout-sessions/{id}/exercises`   Adicionar exercício à
                                                               sessão

  POST                    `/session-exercises/{id}/sets`       Registrar série

  PATCH                   `/sets/{id}`                         Corrigir série

  POST                    `/workout-sessions/{id}/finish`      Finalizar sessão

  GET                     `/workout-sessions`                  Consultar histórico com
                                                               paginação

  GET                     `/analytics/overview`                Resumo de desempenho

  GET                     `/analytics/exercises/{id}`          Evolução por exercício

  GET                     `/personal-records`                  Listar recordes

  GET                     `/restrictions`                      Consultar restrições do
                                                               usuário

  PUT                     `/restrictions`                      Atualizar restrições

  POST                    `/ai/workout-proposals`              Gerar proposta de
                                                               treino

  POST                    `/ai/load-recommendations`           Solicitar sugestão de
                                                               carga
  ------------------------------------------------------------------------------------

### Padrões para a API

-   Usar DTOs de entrada e saída, sem expor entidades diretamente.
-   Validar os dados com Bean Validation e regras de domínio.
-   Paginar históricos e listagens.
-   Retornar códigos HTTP adequados e mensagens de erro consistentes.
-   Validar a propriedade do recurso em todas as operações.
-   Considerar idempotência para evitar duplicação em tentativas
    repetidas de registro.
-   Documentar endpoints e exemplos com OpenAPI.
-   Não retornar informações internas, stack traces ou segredos ao
    cliente.

------------------------------------------------------------------------

## 11. Regras de negócio

### Registro de séries

1.  Uma série pertence a um exercício realizado dentro de uma sessão.
2.  Carga e distância devem aceitar apenas valores válidos e não
    negativos.
3.  Repetições devem ser números inteiros válidos para o tipo de
    exercício.
4.  O sistema deve registrar quando a série foi concluída.
5.  Uma série editada deve continuar associada ao histórico correto.
6.  Repetir a mesma requisição por falha de rede não deve criar
    duplicatas quando houver uma chave de idempotência.

### Volume de treino

Para séries de musculação que tenham carga e repetições registradas:

`volume = carga × repetições`

O volume total de um exercício ou sessão pode ser calculado pela soma
das séries válidas. É necessário definir como tratar exercícios com peso
corporal, assistência, unidades diferentes e movimentos em que a métrica
não seja adequada.

### Estimativa de 1RM

O aplicativo poderá exibir uma estimativa de repetição máxima (1RM)
usando uma fórmula documentada e apropriada para o contexto. A
estimativa não é uma medição real e pode ser imprecisa, especialmente
com muitas repetições ou exercícios específicos.

### Recordes pessoais

-   Comparar a nova série com os registros válidos do mesmo usuário e
    exercício.
-   Definir tipos de recorde, como maior carga, maior número de
    repetições em uma carga e melhor 1RM estimado.
-   Evitar comparar valores de unidades incompatíveis.
-   Atualizar recordes de forma transacional para evitar
    inconsistências.
-   Informar ao usuário qual tipo de recorde foi alcançado.

### Sugestão de carga

-   Usar o histórico do próprio usuário e o objetivo informado.
-   Exibir a sugestão como ponto de partida, não como obrigação.
-   Considerar qualidade dos dados, esforço percebido e contexto
    disponível.
-   Permitir ajuste manual e rejeição da recomendação.
-   Não aumentar automaticamente a carga apenas porque houve uma melhora
    isolada.

------------------------------------------------------------------------

## 12. Integração com IA

### Geração de treino por texto

Exemplo de solicitação:

> "Monte uma proposta de treino de costas, com foco em hipertrofia,
> usando os equipamentos disponíveis."

Fluxo recomendado:

1.  O aplicativo envia o pedido ao backend.
2.  O backend valida o usuário, preferências, equipamentos e restrições
    informadas.
3.  O serviço de IA recebe apenas o contexto necessário.
4.  A IA retorna uma estrutura definida, por exemplo, JSON com
    exercícios, séries, repetições, descanso e justificativas.
5.  O backend valida IDs de exercícios, limites e formato.
6.  O usuário revisa a proposta e confirma antes de salvar.
7.  O programa aprovado é persistido no banco.

A IA não deve inventar IDs de exercícios nem gravar diretamente no
banco. O backend deve validar todas as referências.

### Sugestão de carga e repetições

O serviço poderá considerar:

-   Cargas e repetições anteriores.
-   Frequência de execução do exercício.
-   Esforço percebido, quando informado.
-   Objetivo selecionado.
-   Restrições e preferências disponíveis.

A recomendação deve apresentar contexto e incerteza. Se não houver
histórico suficiente, o sistema deve informar isso e evitar aparentar
uma precisão inexistente.

### Coaching com IA

O assistente poderá resumir tendências dos dados registrados, explicar
métricas e sugerir perguntas para discussão com um profissional
qualificado. Não deve diagnosticar lesões, substituir atendimento médico
ou garantir resultados.

### Voz para registro de séries

Exemplo: "vinte quilos por dez repetições".

Fluxo:

1.  Capturar áudio com consentimento e permissão do sistema operacional.
2.  Converter fala em texto por serviço de reconhecimento de voz.
3.  Interpretar carga, repetições e exercício no contexto atual.
4.  Apresentar os valores reconhecidos.
5.  Solicitar confirmação se houver ambiguidade.
6.  Registrar a série somente após confirmação ou conforme uma
    configuração explícita e segura.

------------------------------------------------------------------------

## 13. Offline e sincronização

O modo offline completo deve ser implementado depois que o fluxo online
estiver estável.

Estratégia sugerida:

-   Guardar localmente sessões em andamento e operações pendentes.
-   Identificar cada operação com UUID ou chave idempotente.
-   Marcar operações como pendentes, sincronizadas ou com erro.
-   Repetir envios com política de retry controlada.
-   Resolver conflitos explicitamente, sem sobrescrever silenciosamente
    séries já registradas.
-   Proteger dados locais e limpar sessões locais no logout quando
    apropriado.

O aplicativo deve informar quando os dados ainda não foram
sincronizados.

------------------------------------------------------------------------

## 14. Segurança e privacidade

-   Utilizar HTTPS em ambientes publicados.
-   Armazenar senhas com algoritmo de hash apropriado, como Argon2id ou
    BCrypt, usando configuração segura.
-   Nunca armazenar senhas em texto puro.
-   Proteger tokens e credenciais de acordo com as recomendações da
    plataforma.
-   Aplicar autorização no backend, inclusive em operações de leitura.
-   Implementar limites de requisição e proteção contra abuso,
    especialmente em endpoints de IA.
-   Manter segredos em variáveis de ambiente ou gerenciador de segredos.
-   Não versionar arquivos `.env` com credenciais reais.
-   Coletar o mínimo de dados pessoais necessário.
-   Permitir que o usuário compreenda, exporte e solicite a exclusão de
    seus dados conforme as regras aplicáveis.
-   Definir retenção e exclusão de fotos e dados sensíveis.
-   Tratar dados de saúde e imagens corporais com controles reforçados,
    consentimento claro e acesso restrito.
-   Avaliar obrigações da LGPD antes de publicar o produto.
-   Criar políticas de denúncia, bloqueio e moderação antes de liberar
    recursos sociais.

------------------------------------------------------------------------

## 15. Interface e navegação

### Abas principais sugeridas

1.  **Início:** resumo do dia e acesso ao treino.
2.  **Treinos:** programas, divisões e catálogo de exercícios.
3.  **Começar treino:** sessão ativa, registro de séries e descanso.
4.  **Evolução:** gráficos, volume, recordes e histórico.
5.  **Perfil:** preferências, restrições, privacidade e configurações.

O chat de IA poderá ser acessado a partir de Treinos e Evolução, para
receber contexto relevante sem sobrecarregar a navegação principal.

### Direção visual

-   Tema escuro opcional com grafite e verde-limão como cor de destaque.
-   Tipografia legível e hierarquia visual clara.
-   Botões grandes para uso durante o treino.
-   Registro de série em poucos toques.
-   Contraste adequado e alternativas a informações transmitidas apenas
    por cor.
-   Estados visíveis para carregamento, erro, ausência de dados e
    sincronização pendente.

### Telas do MVP

-   Boas-vindas e autenticação.
-   Configuração inicial de perfil.
-   Dashboard.
-   Catálogo e busca de exercícios.
-   Lista de programas.
-   Editor de programa.
-   Treino em andamento.
-   Registro/edição de série.
-   Resumo da sessão concluída.
-   Histórico.
-   Detalhe do exercício e gráficos.
-   Recordes pessoais.
-   Configurações e privacidade.

------------------------------------------------------------------------

## 16. Testes

### Backend

-   Testes unitários para cálculo de volume, estimativa de 1RM e
    detecção de recordes.
-   Testes de serviços para criação e finalização de sessões.
-   Testes de integração com PostgreSQL.
-   Testes de autorização para impedir acesso a dados de outro usuário.
-   Testes de validação de DTOs.
-   Testes para requisições repetidas e idempotência.
-   Testes para indisponibilidade e timeout do serviço de IA.

### Mobile

-   Testes dos componentes de registro de séries.
-   Testes de navegação e estados de carregamento.
-   Testes de tratamento de falhas de rede.
-   Testes de formulários e validação.
-   Testes em diferentes tamanhos de tela.

### Critérios de aceite do MVP

-   O usuário consegue criar conta e entrar com segurança.
-   O usuário consegue criar um programa e iniciar uma sessão.
-   É possível registrar, editar e consultar séries.
-   A sessão finalizada aparece no histórico.
-   O volume e os recordes são calculados de forma consistente.
-   Um usuário não consegue consultar ou editar dados privados de outro.
-   A documentação da API está disponível.
-   O projeto possui instruções reproduzíveis para execução local.
-   Os testes essenciais passam antes de cada entrega.

------------------------------------------------------------------------

## 17. Plano de execução

### Etapa 1 --- Preparação

-   [ ] Criar repositório Git.
-   [ ] Definir nome, identidade visual e escopo do MVP.
-   [ ] Criar projetos mobile e backend.
-   [ ] Configurar PostgreSQL e ambiente local.
-   [ ] Definir convenções de código e branches.
-   [ ] Criar README e documentação técnica inicial.

### Etapa 2 --- Backend

-   [ ] Configurar Spring Boot e Maven.
-   [ ] Configurar banco e Flyway.
-   [ ] Implementar autenticação e perfil.
-   [ ] Implementar catálogo de exercícios.
-   [ ] Implementar programas de treino.
-   [ ] Implementar sessões e séries.
-   [ ] Implementar histórico, métricas e recordes.
-   [ ] Documentar endpoints.
-   [ ] Criar testes automatizados.

### Etapa 3 --- Aplicativo mobile

-   [ ] Configurar React Native, Expo e TypeScript.
-   [ ] Criar navegação e componentes compartilhados.
-   [ ] Implementar autenticação.
-   [ ] Criar dashboard e catálogo.
-   [ ] Implementar editor de programas.
-   [ ] Implementar registro rápido de séries.
-   [ ] Criar histórico e evolução.
-   [ ] Tratar carregamento, erros e estados vazios.

### Etapa 4 --- IA

-   [ ] Criar serviço isolado para o provedor de IA.
-   [ ] Definir formato estruturado de resposta.
-   [ ] Implementar geração de propostas.
-   [ ] Validar respostas no backend.
-   [ ] Implementar sugestões com histórico disponível.
-   [ ] Criar limites de uso, logs seguros e tratamento de falhas.
-   [ ] Exigir revisão do usuário antes de salvar propostas.

### Etapa 5 --- Qualidade e entrega

-   [ ] Executar testes de integração.
-   [ ] Revisar segurança e permissões.
-   [ ] Testar em dispositivos reais.
-   [ ] Criar pipeline de build e testes.
-   [ ] Preparar demonstração e screenshots.
-   [ ] Atualizar documentação e publicar uma versão demonstrável.

------------------------------------------------------------------------

## 18. Organização do Git

Sugestão de branches:

-   `main`: versão estável.
-   `develop`: integração de funcionalidades, se o fluxo escolhido
    utilizar essa branch.
-   `feature/authentication`
-   `feature/exercise-catalog`
-   `feature/workout-session`
-   `feature/workout-analytics`
-   `feature/ai-workout-generation`

Exemplos de mensagens de commit:

-   `feat: add user authentication`
-   `feat: implement workout session logging`
-   `feat: calculate personal records`
-   `test: cover workout volume calculation`
-   `docs: document workout endpoints`
-   `fix: prevent duplicate set submissions`

Não incluir tokens, senhas, arquivos de configuração com segredos ou
dados reais de usuários no Git.

------------------------------------------------------------------------

## 19. Diferenciais para o portfólio

Ao apresentar o projeto em currículo ou entrevista, destacar resultados
demonstráveis:

-   Aplicativo mobile com React Native e TypeScript.
-   Backend Java com Spring Boot e arquitetura em camadas.
-   API REST documentada com OpenAPI.
-   Modelagem relacional em PostgreSQL.
-   Autenticação e autorização.
-   Testes automatizados.
-   Regras de negócio para histórico, volume e recordes.
-   Integração com IA usando saídas estruturadas e validação.
-   Docker para ambiente local.
-   Tratamento de erros, segurança e documentação.
-   Planejamento de sincronização offline e escalabilidade futura.

Descrever como projeto de portfólio e informar com transparência quais
recursos estão implementados, quais estão em desenvolvimento e quais são
apenas planejados.

------------------------------------------------------------------------

## 20. Decisões pendentes

Antes de iniciar a implementação, confirmar:

-   Nome definitivo e identidade visual.
-   Se o primeiro lançamento será Android ou Android e iOS.
-   Provedor de IA e orçamento de uso.
-   Modelo de autenticação e estratégia de tokens.
-   Fórmula e limites das estimativas de 1RM.
-   Regras de privacidade e retenção de dados.
-   Quais atividades entram no MVP além da musculação.
-   Se o catálogo inicial será manual ou importado de uma fonte com
    licença adequada.
-   Estratégia de hospedagem e implantação.

## 21. Próximo passo recomendado

Começar pela **Fase 1 --- MVP**, nesta ordem:

1.  Criar o repositório e a estrutura dos projetos.
2.  Subir PostgreSQL em ambiente local.
3.  Implementar usuário e autenticação.
4.  Implementar exercícios, programas, sessões e séries.
5.  Criar testes para regras de negócio.
6.  Construir as telas mobile conectadas à API.
7.  Só então integrar a geração de treinos por IA.

Essa sequência reduz o risco de construir uma interface atraente sem uma
base de dados e regras confiáveis. A IA será mais útil quando o
aplicativo já possuir um histórico consistente para consultar.

------------------------------------------------------------------------

**Documento de planejamento inicial.** As funcionalidades, tecnologias e
regras descritas são propostas para orientar o desenvolvimento; não
representam funcionalidades já implementadas.
