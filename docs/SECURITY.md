# Segurança e Privacidade — IronMind AI

Este documento descreve o modelo de ameaça, os controles **implementados** no
backend e o que depende da infraestrutura. Requisitos funcionais relacionados em
[`SPEC.md`](SPEC.md#14-segurança-privacidade-e-conformidade). O contrato da
identidade delegada está detalhado em
[`AUTH-INTEGRATION.md`](AUTH-INTEGRATION.md).

> **Resumo:** o backend não autentica ninguém. Ele recebe o UUID do usuário no
> header `X-User-UUID`, injetado pelo gateway, e autoriza **todo** acesso pelo
> proprietário do recurso. Recurso de outro usuário responde `404`. O serviço não
> guarda conta, senha, token, perfil ou preferências.

---

## 1. Modelo de ameaça resumido

| Ameaça | Mitigação | Onde |
|---|---|---|
| Acesso a dados de outro usuário | Filtro por `userId` em toda consulta de recurso privado; recurso alheio responde `404` | Backend |
| Identidade forjada no header | O gateway remove o header enviado pelo cliente e injeta o UUID validado; o backend rejeita header duplicado ou malformado | Infraestrutura + backend |
| Acesso direto ao backend | Backend não é alcançável fora da rede do gateway | Infraestrutura |
| Header ausente, vazio, duplicado ou concatenado | Resposta `401 UNAUTHENTICATED` antes de qualquer regra de negócio | Backend |
| `userId` no corpo da requisição | Ignorado; o dono vem apenas do contexto preenchido pelo filtro | Backend |
| Mass assignment | DTOs de entrada explícitos; nenhum aceita `userId` | Backend |
| Injeção de consulta no MongoDB | Criteria/`@Query` com parâmetros; nenhuma concatenação de string vinda do cliente | Backend |
| Replay de requisição em falha de rede | `Idempotency-Key` com escopo por usuário e endpoint; a série guarda a chave sob índice único | Backend |
| Prompt injection via IA | Contexto montado pelo backend; IA sem acesso ao banco; saída validada contra esquema; IDs inventados rejeitados | Backend |
| Prompt injection com efeito de escrita | A IA não grava; apenas o usuário confirma; o backend valida toda referência | Backend |
| Abuso e custo descontrolado de IA | Rate limiting em memória, cota diária por usuário, timeout, retry limitado, circuit breaker | Backend |
| Vazamento de dado sensível em log | Logs sem corpo de requisição, token, identidade ou transcrição de voz | Backend |
| Exfiltração via endpoint público | Rotas privadas exigem identidade; CORS restrito; rate limiting na IA | Backend |
| Negação de serviço | Paginação obrigatória, limites de payload, timeout de dependência e limites de tamanho nas respostas de IA | Backend |
| Banco comprometido | Autenticação do MongoDB, keyfile do replica set, volume não exposto publicamente | Infraestrutura |

---

## 2. Controles por camada

### 2.1 Identidade delegada

| Camada | Responsabilidade | Situação |
|---|---|---|
| Autenticação do usuário | provedor de identidade + gateway (login, sessão, expiração, revogação) | **Infraestrutura** |
| Autenticação do canal | garantia de que a requisição passou pelo gateway e que o cliente não escreveu a identidade | **Infraestrutura** |
| Autorização de recursos | backend: filtro por proprietário, `404` para recurso alheio | **Implementada** |

**Implementado no backend:**

- `IdentityHeaderFilter` lê **exatamente um** valor do header configurado por
  `app.security.identity.user-uuid-header` (`USER_UUID_HEADER`, padrão
  `X-User-UUID`).
- O valor precisa ser um UUID canônico e não nulo. UUID em maiúsculas é
  normalizado; `urn:uuid:`, valor entre chaves, sem hífens, com vírgula,
  duplicado ou vazio é rejeitado.
- Em rota privada, identidade ausente ou inválida responde
  `401 UNAUTHENTICATED`; nenhuma regra de negócio é executada.
- Em rota pública (`GET /api/v1/exercises/**` e `/api/v1/health`), um header
  inválido é ignorado e a requisição segue anônima.
- `SecurityUtils.requireCurrentUserId()` é a única fonte do dono. Nenhum
  controller, service ou DTO lê o header diretamente.
- O serviço **não** cria usuário, não guarda `identity_subject`, não mantém
  tombstone e não expõe `/users/me`. A conta é responsabilidade do IdP.

**Premissa da infraestrutura (não é código deste backend):**

1. o gateway autentica a sessão no provedor de identidade antes de encaminhar;
2. o gateway **remove** qualquer header de identidade enviado pelo cliente e
   injeta o UUID do titular validado;
3. o backend não é alcançável fora da rede do gateway;
4. token ausente, inválido, expirado ou revogado não chega ao backend;
5. gateway e backend não registram token nem PII desnecessária.

### 2.2 Aplicativo mobile

- Nenhum segredo de servidor no bundle — o app conhece apenas URLs públicas.
- Nenhuma chamada de IA direta do dispositivo: sempre pelo backend.
- Dados locais de rascunho no SQLite; limpeza no logout.
- TLS obrigatório; certificate pinning é decisão de produção ainda pendente.
- O app **ainda pertence ao contrato antigo** (`/auth/*`, `/users/me`) e precisa
  ser migrado para a identidade injetada pelo gateway. Enquanto isso, o modo
  mock é o caminho suportado para navegar pelo aplicativo.

**Específico de Android (primeiro lançamento):**

- `android:allowBackup="false"` — backup do sistema não deve extrair o banco
  SQLite com rascunhos.
- `android:usesCleartextTraffic="false"` — tráfego em texto puro bloqueado.
- Keystore e chave de upload do Play **fora** do repositório e fora da máquina
  de CI, com segredo de CI próprio.
- `android:exported="false"` em toda Activity que não precise ser aberta por
  outro app.
- `FLAG_SECURE` avaliado para o registro de treino, caso se julgue necessário:
  dados de saúde do usuário não podem aparecer na lista de aplicativos recentes.

### 2.3 Backend

- **Sem autenticação própria:** não há JWT, senha, refresh token, recuperação
  de acesso, Redis ou endpoint `/auth/*`.
- **Autorização:** `authorizeHttpRequests` com rotas públicas explícitas; toda
  rota restante exige identidade. A autorização por recurso é verificada no
  serviço, não apenas na rota.
- **Entrada:** Bean Validation em todos os DTOs + regras de domínio.
- **Erros:** handler global com formato único; stack trace, nome de coleção e
  caminho de arquivo nunca chegam ao cliente.
- **Idempotência:** `Idempotency-Key` nas escritas que criam registro. O
  registro de série usa chave durável no documento com índice único sparse; os
  demais fluxos usam o store em memória (limitação conhecida: não é compartilhado
  entre instâncias e é perdido no restart).
- **IA:** rate limit em memória (10 requisições por 60 s por usuário, por
  padrão), cota diária (50), timeout, retry limitado e circuit breaker.
- **CORS:** origens explícitas por ambiente. O header de identidade **não** é
  liberado em `Access-Control-Allow-Headers`: quem o adiciona é o gateway, não o
  cliente.
- **Headers:** `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` e `Content-Security-Policy` na borda.
- **Logs:** `traceId` por requisição; sem token, sem identidade completa e sem
  dado corporal.
- **Actuator:** apenas `health` e `info` expostos; o resto fica fora da
  exposição pública.

### 2.4 Infraestrutura

- MongoDB com autenticação habilitada (`MONGO_INITDB_ROOT_USERNAME` /
  `MONGO_INITDB_ROOT_PASSWORD`), acessível apenas pela rede do compose/cluster.
- Replica set com **keyfile** de autenticação interna, gerado no volume na
  primeira subida e nunca versionado.
- Porta do Mongo publicada apenas em `127.0.0.1` para inspeção local.
- `.env` real **nunca** versionado — apenas `.env.example` com placeholders.
- Scan automático de segredos no CI (job `secret-scan`).
- Imagens Docker executando como usuário não-root quando possível.
- Backup e restauração do volume do MongoDB são responsabilidade operacional;
  roteiro de teste ainda pendente.

---

## 3. IA — controles específicos

O requisito mais importante do projeto em termos de segurança:

> **A IA propõe; o backend valida; o usuário revisa e decide.**

| Controle | Detalhe |
|---|---|
| Chave da API | Somente no backend, em variável de ambiente |
| Contexto enviado | Mínimo necessário: objetivo e experiência padrão, restrições ativas, exercício do catálogo, histórico relevante. Nunca token ou foto |
| Saída | DTO com esquema fixo; resposta que não parse ou viola limites é rejeitada (`AI_INVALID_RESPONSE`) |
| Referências | IDs de exercício inventados são descartados; o backend só persiste IDs existentes |
| Escrita | A IA **nunca** grava no banco. O usuário revisa e confirma |
| Limites | Cota por usuário/dia, timeout, retry limitado, circuit breaker |
| Prompt injection | O conteúdo do usuário é delimitado como dado, nunca como instrução; o backend define as regras de saída |
| Alcance clínico | Não diagnostica, não prescreve tratamento, não recomenda suplementação como tratamento, não promete resultado |
| Retenção | Não guarda conversa completa; `ai_recommendations` guarda resumo de entrada e saída estruturada |
| Treinamento de modelo | Não usar dados pessoais do usuário para treinar modelos sem base legal, transparência e consentimento |

> O serviço não tem as preferências do usuário: o contexto de IA usa os padrões
> documentados (objetivo `GENERAL`, experiência `BEGINNER`, 3 dias, sem filtro
> de equipamento). Unidades e objetivo pertencem à conta no provedor de
> identidade.

---

## 4. LGPD — checklist

| Item | Status |
|---|---|
| Base legal definida para cada tratamento | Pendente |
| Consentimento explícito para dados sensíveis (restrições, fotos) | Implementado no desenho |
| Finalidade declarada e visível | Implementado no desenho |
| Coleta mínima | **Melhorado** — o backend não guarda cadastro, e-mail, senha ou perfil |
| Consentimento para tratamento e para IA | Pendente |
| Direito de acesso | Parcial — as APIs devolvem os dados do titular; não há tela/web de autoatendimento |
| Direito de exportação | Pendente — endpoint de exportação |
| Direito de exclusão | Fora do backend — executado pelo IdP/edge (ver §5) |
| Revogação de consentimento | Implementado (`active` em restrições) |
| Retenção e descarte automático | Pendente — política a definir |
| Registro de operações de tratamento | Pendente |
| Encarregado (DPO) designado | Pendente |
| Canal de atendimento ao titular | Pendente |

---

## 5. Privacidade por padrão

- Programas, sessões, séries, recordes e restrições são **privados por padrão**.
  Compartilhamento é opt-in e explícito (Fase 3).
- Restrições e medidas são acessíveis apenas pelo titular.
- Recurso de outro usuário responde `404` — a API não confirma nem nega a
  existência de dados alheios.
- O backend **não expõe** endpoint de conta: não há `GET/PATCH/DELETE /users/me`,
  nem perfil, nem exclusão in-app. Quem cria, altera e apaga a conta é o
  provedor de identidade.
- A exclusão dos dados do titular é executada pelo IdP/edge, que remove os
  documentos pelo `userId` (ver
  [`DATA-MODEL.md` §8](DATA-MODEL.md#8-exclusão-dos-dados-do-titular)). Um UUID
  que volte a aparecer vê um histórico vazio; bloquear a recriação é papel do
  IdP, não do backend.
- Admin não tem leitura livre sobre dados de saúde: acesso excepcional,
  justificado e auditado.

---

## 6. Pendências de segurança

| # | Pendência | Situação |
|---|---|---|
| 1 | Verificar no ambiente real que o gateway remove o header do cliente e que o backend não é alcançável por fora | **Pendente — bloqueia produção** |
| 2 | Migrar o app mobile para o contrato de identidade injetada | Pendente |
| 3 | Rate limiting de identidade/abuso na borda (gateway, por IP) | Infraestrutura |
| 4 | Store de idempotência compartilhado entre instâncias | Parcial — série durável; demais fluxos em memória |
| 5 | Rotação e teste de backup do MongoDB | Pendente |
| 6 | Certificate pinning no app | Pendente |
| 7 | Política de privacidade, termos de uso e encarregado (DPO) | **Parcial** — rascunhos em [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md); falta revisão jurídica, publicação em URL pública e designação do DPO |
| 8 | Política de retenção de dados de IA | Pendente |
| 9 | URL web de solicitação de exclusão exigida pelo formulário *Data Safety* | Pendente |
| 10 | Keystore e chave de upload do Play fora do repositório | Pendente — checklist em [`PLAY-RELEASE.md`](PLAY-RELEASE.md) |
| 11 | Auditoria de ações de administrador | Pendente — não existe painel de administração |
| 12 | Testes de penetração nos endpoints de IA | Pendente |

---

## 7. Reporte de vulnerabilidade

Enquanto o projeto não tem canal público, reporte por issue privada no
repositório ou pelo e-mail do mantenedor. Não divulgue detalhes em issue
pública antes de uma correção existir.
