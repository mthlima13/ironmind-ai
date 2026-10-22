# IronMind AI — Aplicativo Fitness Inteligente

> **Treine com inteligência. Evolua com dados.**
>
> Documento de visão, requisitos e plano técnico para desenvolver um aplicativo mobile de treinamento físico com inteligência artificial, acompanhamento de desempenho e recursos sociais.

---

## 1. Visão do produto

O **IronMind AI** é um aplicativo de treinamento que ajuda usuários a planejar, registrar e analisar seus exercícios. Ele utiliza o histórico de treinos para oferecer sugestões personalizadas, permite gerar planos por linguagem natural e transforma dados de desempenho em informações úteis para o usuário.

O produto combina:

- Registro rápido de séries, cargas e repetições.
- Planejamento de treinos e programas.
- Recomendações assistidas por inteligência artificial.
- Histórico, gráficos e recordes pessoais.
- Acompanhamento de atividades cardiovasculares.
- Recursos sociais e gamificação.
- Funcionamento offline com sincronização posterior.

### Objetivos

1. Tornar o registro de treinos rápido e intuitivo.
2. Ajudar o usuário a acompanhar sua evolução com dados consistentes.
3. Oferecer sugestões contextualizadas sem substituir profissionais de saúde ou educação física.
4. Criar uma experiência mobile moderna, acessível e confiável.
5. Construir uma base técnica escalável para recursos futuros.

### Público-alvo

- Pessoas que praticam musculação e desejam acompanhar a progressão.
- Usuários que seguem divisões como Push/Pull/Legs, Upper/Lower e Full Body.
- Pessoas que praticam cardio ou outras modalidades.
- Treinadores e criadores de programas, em fases futuras.

---

## 2. Escopo do projeto

O desenvolvimento será dividido em fases para permitir a entrega de uma versão utilizável antes de implementar recursos avançados.

### Fase 1 — MVP

**Objetivo:** entregar um aplicativo de treino funcional.

- Cadastro, login e recuperação de acesso.
- Perfil e preferências de treino.
- Catálogo inicial de exercícios.
- Criação e edição de programas de treino.
- Registro de sessões, séries, carga, repetições e descanso.
- Histórico de treinos.
- Identificação de recordes pessoais.
- Painel inicial com resumo da atividade.
- API REST com autenticação.
- Persistência local básica e sincronização planejada.

### Fase 2 — IA e automação

- Geração de treino a partir de texto.
- Sugestões de carga e repetições com base no histórico.
- Chat de coaching contextualizado.
- Registro de séries por voz.
- Detecção de inconsistências e confirmação de dados ambíguos.
- Recomendações de ajuste de treino sujeitas à validação do usuário.

### Fase 3 — Comunidade e gamificação

- Perfil público opcional.
- Amigos e equipes (*Crews*).
- Publicações, reações e comentários.
- XP, sequência de atividade e desafios semanais.
- Rankings com regras transparentes e controles de privacidade.

### Fase 4 — Recursos avançados

- Integração com plataformas de saúde e dispositivos compatíveis.
- Sincronização offline mais robusta.
- Programas de treinadores e marketplace.
- Acompanhamento de medidas e fotos corporais.
- Recursos nativos de atividade em andamento.
- Cardio com métricas específicas por modalidade.

---

## 3. Tecnologias recomendadas

### Aplicativo mobile

- **React Native**
- **Expo**
- **TypeScript**
- React Navigation ou Expo Router
- Biblioteca de gerenciamento de estado escolhida conforme a complexidade
- Armazenamento local seguro para dados apropriados ao dispositivo

O React Native permite desenvolver para Android e iOS com uma base de código compartilhada. Recursos específicos de cada sistema operacional devem ser verificados antes da implementação.

### Backend

- **Java**
- **Spring Boot**
- Spring Security
- Spring Data JPA
- Bean Validation
- Maven
- OpenAPI/Swagger para documentação da API

### Dados e infraestrutura

- **PostgreSQL** como banco de dados principal
- Flyway ou Liquibase para migrações
- Docker para ambiente de desenvolvimento
- Redis opcional para cache, limitação de requisições ou tarefas que justifiquem seu uso
- Armazenamento de objetos para imagens, com acesso privado quando necessário
- CI/CD para testes e implantação

### Inteligência artificial

- API de modelo de linguagem (LLM)
- Serviço de domínio no backend para montar o contexto do usuário
- Validação de respostas com DTOs e regras de negócio
- Registro de versão, data e justificativa das recomendações

**Princípio arquitetural:** a IA propõe; o backend valida; o usuário revisa e decide. Não confiar em texto gerado por IA como se fosse uma regra de negócio validada.

---

## 4. Arquitetura de alto nível

```text
Aplicativo React Native
        |
        | HTTPS / JSON
        v
API REST — Spring Boot
        |
        +---- Autenticação e autorização
        |
        +---- Usuários e preferências
        |
        +---- Programas e sessões de treino
        |
        +---- Séries e recordes pessoais
        |
        +---- Estatísticas e relatórios
        |
        +---- Serviço de IA
        |        |
        |        +---- API externa de LLM
        |
        +---- Comunidade (fase futura)
        |
        v
PostgreSQL

Serviços complementares:
- Armazenamento de arquivos
- Notificações push
- Observabilidade e logs
- Sincronização offline
```

### Diretrizes arquiteturais

- Separar controllers, services, repositories e DTOs.
- Manter regras de negócio fora dos controllers.
- Validar toda entrada recebida pela API.
- Aplicar autorização por usuário em todos os recursos privados.
- Não incluir chaves de API no aplicativo mobile.
- Não registrar senhas, tokens ou dados pessoais sensíveis nos logs.
- Versionar alterações do banco de dados.
- Criar testes unitários e de integração.
- Projetar operações de sincronização para evitar duplicações.

---

## 5. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF-001 | Permitir cadastro e autenticação de usuários | Alta |
| RF-002 | Permitir editar perfil, preferências e objetivos de treino | Alta |
| RF-003 | Consultar catálogo de exercícios | Alta |
| RF-004 | Criar, editar, ordenar e excluir programas próprios | Alta |
| RF-005 | Registrar sessões de treino | Alta |
| RF-006 | Registrar exercício, série, carga, repetições e descanso | Alta |
| RF-007 | Consultar histórico de sessões | Alta |
| RF-008 | Detectar recordes pessoais com regras documentadas | Alta |
| RF-009 | Exibir gráficos de evolução | Média |
| RF-010 | Gerar propostas de treino a partir de texto usando IA | Média |
| RF-011 | Sugerir carga e repetições com base no histórico | Média |
| RF-012 | Converter comando de voz em dados para revisão | Média |
| RF-013 | Permitir registrar cardio e outras modalidades | Média |
| RF-014 | Permitir informar limitações e exercícios a evitar | Alta |
| RF-015 | Sincronizar alterações feitas offline | Média |
| RF-016 | Compartilhar treinos e conquistas com controles de privacidade | Baixa |
| RF-017 | Criar equipes, desafios e rankings | Baixa |
| RF-018 | Permitir programas de criadores e marketplace | Baixa |

---

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-001 | Comunicação cliente-servidor por HTTPS em ambientes publicados |
| RNF-002 | Senhas armazenadas com algoritmo de hash apropriado, nunca em texto puro |
| RNF-003 | Autorização por recurso e usuário no backend |
| RNF-004 | Validação de dados tanto no aplicativo quanto na API |
| RNF-005 | Interface responsiva, acessível e adequada a diferentes tamanhos de tela |
| RNF-006 | Mensagens de erro compreensíveis e sem exposição de detalhes internos |
| RNF-007 | Testes automatizados para regras críticas |
| RNF-008 | Registro de logs sem segredos ou dados sensíveis desnecessários |
| RNF-009 | Estratégia de backup e recuperação do banco de dados |
| RNF-010 | Consentimento explícito para recursos que tratem dados sensíveis |
| RNF-011 | Sincronização idempotente para reduzir registros duplicados |
| RNF-012 | Documentação de instalação, execução e implantação |

Metas de desempenho devem ser definidas e medidas com testes. Evite prometer disponibilidade ou tempo de resposta antes de ter infraestrutura e métricas reais.

---

## 7. Principais fluxos de usuário

### 7.1 Registrar um treino

1. O usuário abre a tela inicial.
2. Seleciona um programa ou inicia um treino livre.
3. Escolhe um exercício.
4. Registra carga, repetições e, opcionalmente, esforço percebido.
5. O aplicativo sugere valores anteriores como atalho.
6. O usuário confirma a série.
7. O sistema salva o registro e verifica se há um novo recorde.
8. Ao finalizar, a sessão aparece no histórico e nas estatísticas.

### 7.2 Gerar treino com IA

1. O usuário descreve o objetivo em linguagem natural.
2. O aplicativo envia o pedido à API.
3. O backend recupera preferências, experiência, equipamentos e histórico relevante.
4. O serviço de IA gera uma proposta estruturada.
5. O backend valida o formato, os exercícios e as restrições aplicáveis.
6. O usuário revisa e ajusta a proposta.
7. Somente após confirmação o programa é salvo.

### 7.3 Registrar série por voz

1. O usuário inicia a captura de voz.
2. O sistema transcreve a fala.
3. A aplicação interpreta carga e repetições.
4. Se houver ambiguidade, solicita confirmação.
5. A série só é gravada após a confirmação necessária.

Exemplo de entrada: “cem quilos por oito”.

A interpretação deve respeitar unidades, idioma e configurações do usuário. A interface precisa oferecer entrada manual como alternativa.

---

## 8. Modelo inicial de dados

O modelo pode ser expandido conforme os requisitos evoluírem.

### Entidades principais

#### `users`

- `id` — UUID, chave primária
- `name`
- `email` — único
- `password_hash` — quando houver autenticação local
- `created_at`
- `updated_at`

#### `user_preferences`

- `id`
- `user_id` — referência a `users`
- `preferred_units` — kg/lb
- `training_experience`
- `available_equipment`
- `training_days`
- `privacy_settings`

#### `exercises`

- `id`
- `name`
- `description`
- `primary_muscle_group`
- `equipment`
- `instructions`
- `is_custom`
- `created_by_user_id` — opcional

#### `workout_programs`

- `id`
- `user_id`
- `name`
- `description`
- `goal`
- `created_at`
- `updated_at`

#### `program_days`

- `id`
- `program_id`
- `name`
- `position`

#### `program_exercises`

- `id`
- `program_day_id`
- `exercise_id`
- `position`
- `target_sets`
- `target_reps`
- `rest_seconds`

#### `workout_sessions`

- `id`
- `user_id`
- `program_id` — opcional
- `started_at`
- `completed_at` — opcional
- `status`
- `notes`

#### `session_exercises`

- `id`
- `session_id`
- `exercise_id`
- `position`

#### `exercise_sets`

- `id`
- `session_exercise_id`
- `set_number`
- `weight`
- `repetitions`
- `duration_seconds` — opcional
- `distance_meters` — opcional
- `perceived_exertion` — opcional
- `completed_at`

#### `personal_records`

- `id`
- `user_id`
- `exercise_id`
- `record_type`
- `value`
- `achieved_at`
- `source_set_id`

#### `injury_restrictions`

- `id`
- `user_id`
- `body_region`
- `description`
- `restricted_exercise_ids`
- `created_at`
- `updated_at`

> Informações sobre lesões podem ser dados pessoais sensíveis. Coletar somente o necessário, explicar a finalidade, restringir acesso e oferecer controles para revisar e excluir os registros.

#### `ai_recommendations`

- `id`
- `user_id`
- `recommendation_type`
- `input_summary`
- `result_json`
- `model_version`
- `status`
- `created_at`
- `accepted_at` — opcional

### Relacionamentos essenciais

- Um usuário pode possuir vários programas e sessões.
- Um programa contém vários dias.
- Cada dia contém vários exercícios ordenados.
- Uma sessão contém exercícios realizados.
- Cada exercício realizado contém séries.
- Um recorde pertence a um usuário e a um exercício.
- Uma recomendação de IA pertence a um usuário, mas não altera o treino sem confirmação.

### Regras de integridade

- Usar UUIDs ou identificadores consistentes.
- Criar índices para consultas por usuário, data e exercício.
- Definir política de exclusão e retenção de dados.
- Preservar o histórico realizado mesmo quando um programa for editado.
- Usar transações ao finalizar sessões e atualizar recordes.
- Definir unidades de medida explicitamente para evitar conversões incorretas.

---

## 9. Endpoints REST iniciais

Prefixo sugerido: `/api/v1`

| Método | Endpoint | Finalidade |
|---|---|---|
| `POST` | `/auth/register` | Criar conta |
| `POST` | `/auth/login` | Autenticar |
| `GET` | `/users/me` | Consultar perfil |
| `PATCH` | `/users/me` | Atualizar perfil |
| `GET` | `/exercises` | Listar e filtrar exercícios |
| `POST` | `/exercises` | Criar exercício personalizado |
| `GET` | `/programs` | Listar programas |
| `POST` | `/programs` | Criar programa |
| `GET` | `/programs/{id}` | Consultar programa |
| `PUT` | `/programs/{id}` | Atualizar programa |
| `DELETE` | `/programs/{id}` | Excluir programa |
| `POST` | `/workout-sessions` | Iniciar sessão |
| `GET` | `/workout-sessions` | Listar histórico |
| `GET` | `/workout-sessions/{id}` | Consultar sessão |
| `POST` | `/workout-sessions/{id}/sets` | Registrar série |
| `POST` | `/workout-sessions/{id}/complete` | Finalizar sessão |
| `GET` | `/records` | Consultar recordes |
| `GET` | `/analytics/exercises/{id}` | Consultar evolução de exercício |
| `POST` | `/ai/workout-proposals` | Gerar proposta de treino |
| `POST` | `/ai/load-suggestions` | Solicitar sugestão de carga |
| `POST` | `/ai/voice-interpretation` | Interpretar transcrição de voz |

Os endpoints de IA devem aplicar autenticação, limites de uso, validação do conteúdo e controle de custos. O servidor nunca deve aceitar o `user_id` enviado pelo cliente como prova de identidade: deve obtê-lo da sessão autenticada.

---

## 10. Estratégia para a inteligência artificial

### Geração de programas

O modelo deve retornar um objeto estruturado, validado por um esquema definido no backend. Exemplo conceitual:

```json
{
  "name": "Treino de costas",
  "goal": "hipertrofia",
  "exercises": [
    {
      "exerciseId": "UUID_DO_EXERCICIO",
      "sets": 3,
      "repRange": {
        "min": 8,
        "max": 12
      },
      "restSeconds": 120
    }
  ],
  "explanation": "Proposta inicial para revisão do usuário."
}
```

O exemplo é ilustrativo. O backend precisa verificar se os IDs existem, se os valores estão dentro dos limites configurados e se a proposta respeita as restrições aplicáveis.

### Sugestão de carga

Começar com regras simples e explicáveis antes de treinar um modelo próprio:

1. Consultar séries anteriores do mesmo exercício.
2. Considerar carga, repetições e esforço percebido, quando disponíveis.
3. Identificar se o histórico é suficiente e consistente.
4. Produzir uma sugestão conservadora e explicar sua origem.
5. Permitir que o usuário ajuste ou ignore a sugestão.
6. Registrar o resultado para avaliar a qualidade futura das recomendações.

Não aumentar carga automaticamente apenas porque o usuário completou uma série. Dor, fadiga, técnica, equipamento e contexto individual importam.

### Segurança e limites

- A IA não deve diagnosticar lesões ou prescrever tratamento.
- Quando o usuário relatar dor ou limitação, orientar a interromper movimentos que agravem o problema e buscar um profissional qualificado quando apropriado.
- Não prometer resultados físicos ou projeções exatas.
- Não recomendar substâncias ou protocolos de suplementação como tratamento médico.
- Exibir que sugestões são informativas e precisam ser avaliadas pelo usuário.
- Testar respostas adversas, incompletas, inválidas e fora do escopo.

---

## 11. Registro offline e sincronização

O treino deve continuar funcionando quando a conexão cair.

### Estratégia sugerida

1. Salvar localmente as alterações permitidas.
2. Atribuir um identificador único a cada operação.
3. Marcar registros pendentes de sincronização.
4. Enviar operações quando a conexão voltar.
5. Usar chaves de idempotência para impedir duplicações.
6. Tratar conflitos com regras documentadas.
7. Informar ao usuário o estado da sincronização.

O backend deve ser a fonte definitiva dos dados sincronizados. Definir cuidadosamente como tratar edições simultâneas, exclusões e sessões iniciadas em mais de um dispositivo.

---

## 12. Segurança, privacidade e conformidade

- Usar HTTPS em produção.
- Armazenar senhas com algoritmo moderno de hash de senhas, como Argon2id ou BCrypt configurado adequadamente.
- Proteger tokens e credenciais no armazenamento apropriado da plataforma.
- Implementar autorização em todos os endpoints privados.
- Aplicar rate limiting em autenticação e endpoints que geram custos.
- Validar arquivos enviados e limitar formatos e tamanhos.
- Proteger fotos e dados corporais com acesso restrito.
- Obter consentimento para uso de dados de saúde e fotos.
- Permitir que o usuário solicite exportação e exclusão dos seus dados, conforme as regras aplicáveis.
- Revisar obrigações da LGPD e políticas das lojas antes de publicar.
- Não usar dados pessoais para treinamento de modelos sem base legal, transparência e consentimentos necessários.
- Criar política de privacidade e termos de uso antes do lançamento público.

---

## 13. Testes

### Backend

- Testes unitários de serviços e regras de recordes.
- Testes de integração de repositories e endpoints.
- Testes de autorização entre usuários.
- Testes de validação de entradas inválidas.
- Testes de idempotência de registros.
- Testes de migração do banco.

### Mobile

- Testes de componentes e formulários.
- Testes de navegação.
- Testes do registro de séries.
- Testes de estados sem conexão e sincronização.
- Testes em diferentes tamanhos de tela e versões do sistema.

### IA

- Validar formato e limites das respostas.
- Testar pedidos ambíguos e fora do escopo.
- Verificar se restrições do usuário são consideradas.
- Medir aceitação e edição das sugestões.
- Avaliar consistência e custo das chamadas.

---

## 14. Estrutura sugerida do repositório

```text
ironmind-ai/
├── mobile/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── workouts/
│   │   │   ├── exercises/
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
│   │   │   ├── java/
│   │   │   │   └── com/ironmind/
│   │   │   │       ├── auth/
│   │   │   │       ├── user/
│   │   │   │       ├── exercise/
│   │   │   │       ├── program/
│   │   │   │       ├── workout/
│   │   │   │       ├── record/
│   │   │   │       ├── analytics/
│   │   │   │       ├── ai/
│   │   │   │       └── common/
│   │   │   └── resources/
│   │   │       └── db/migration/
│   │   └── test/
│   ├── pom.xml
│   └── Dockerfile
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── data-model.md
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

Não versionar arquivos `.env` reais, senhas, tokens ou chaves de API.

---

## 15. Plano de execução

### Sprint 1 — Fundação

- [ ] Criar repositório e estrutura de pastas.
- [ ] Configurar projeto Spring Boot.
- [ ] Configurar React Native com Expo e TypeScript.
- [ ] Subir PostgreSQL em ambiente local.
- [ ] Configurar migrações e documentação inicial.
- [ ] Criar pipeline básico de testes.

### Sprint 2 — Usuários e exercícios

- [ ] Implementar cadastro e autenticação.
- [ ] Criar perfil e preferências.
- [ ] Criar catálogo inicial de exercícios.
- [ ] Implementar busca e filtros.
- [ ] Escrever testes de autorização.

### Sprint 3 — Treinos

- [ ] Criar programas e dias de treino.
- [ ] Implementar início e conclusão de sessão.
- [ ] Registrar séries, cargas e repetições.
- [ ] Consultar histórico.
- [ ] Criar testes de regras de negócio.

### Sprint 4 — Estatísticas

- [ ] Calcular volume de treino com uma regra documentada.
- [ ] Implementar detecção de recordes.
- [ ] Criar gráficos por exercício.
- [ ] Exibir resumo semanal.
- [ ] Validar resultados com dados de teste.

### Sprint 5 — IA inicial

- [ ] Integrar uma API de LLM pelo backend.
- [ ] Definir esquema de saída estruturada.
- [ ] Validar propostas geradas.
- [ ] Implementar tela para revisar e salvar treinos.
- [ ] Aplicar limites de uso e tratamento de falhas.

### Sprint 6 — Qualidade e publicação de teste

- [ ] Melhorar tratamento de erros e estados de carregamento.
- [ ] Testar diferentes dispositivos.
- [ ] Revisar segurança e privacidade.
- [ ] Preparar ambiente de homologação.
- [ ] Documentar instalação e demonstração do projeto.

As sprints são uma divisão de trabalho sugerida, não uma estimativa garantida de prazo.

---

## 16. Critérios de aceite do MVP

O MVP poderá ser considerado demonstrável quando:

- [ ] Um usuário consegue criar uma conta e acessar seu perfil.
- [ ] Um usuário consegue pesquisar exercícios.
- [ ] Um usuário consegue criar um programa de treino.
- [ ] Uma sessão permite registrar múltiplas séries.
- [ ] Os dados persistem após fechar e abrir o aplicativo.
- [ ] O usuário consegue consultar sessões anteriores.
- [ ] Recordes são calculados de maneira consistente.
- [ ] Um usuário não consegue acessar dados privados de outro.
- [ ] Erros de validação são apresentados de forma compreensível.
- [ ] O projeto pode ser executado seguindo o README.
- [ ] Os testes principais passam no ambiente documentado.

---

## 17. Diferenciais para o portfólio

Este projeto pode demonstrar competências relevantes para vagas de desenvolvimento:

- Desenvolvimento mobile com React Native e TypeScript.
- Backend Java com Spring Boot e APIs REST.
- Modelagem relacional e migrations.
- Autenticação, autorização e segurança.
- Integração de IA com validação de saída.
- Arquitetura em camadas e separação de responsabilidades.
- Testes unitários e de integração.
- Docker e automação de entrega.
- Sincronização offline e resolução de conflitos.
- Visualização de dados e métricas de produto.

### Como apresentar no GitHub

O README público deve incluir:

- Descrição do problema que o aplicativo resolve.
- Funcionalidades implementadas e planejadas, separadas claramente.
- Tecnologias utilizadas.
- Capturas de tela reais da versão atual.
- Instruções de instalação e execução.
- Diagrama de arquitetura.
- Exemplos de requisições e respostas da API.
- Testes executados e limitações conhecidas.
- Roadmap atualizado.

Não descreva recursos planejados como se já estivessem implementados.

---

## 18. Próximos passos imediatos

1. Criar o repositório `ironmind-ai`.
2. Definir os ambientes de desenvolvimento.
3. Implementar o backend e o banco antes de integrar a IA.
4. Criar o fluxo completo de registro de treino.
5. Validar os dados e as regras de recordes.
6. Integrar a primeira funcionalidade de IA.
7. Adicionar recursos sociais somente após o fluxo principal estar estável.

**Princípio central do projeto:** primeiro construir um registro de treino confiável; depois usar esses dados para gerar recomendações realmente úteis.
