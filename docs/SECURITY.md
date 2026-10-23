# Segurança e Privacidade — IronMind AI

Este documento descreve o modelo de ameaça, os controles implementados e o que
ainda está pendente. Requisitos funcionais relacionados em
[`SPEC.md`](SPEC.md#14-segurança-privacidade-e-conformidade).

---

## 1. Modelo de ameaça resumido

| Ameaça | Mitigação |
|---|---|
| Acesso a dados de outro usuário | Filtro por owner em toda consulta de recurso privado; recurso alheio responde `404` |
| Escalada de privilégio | Papéis `USER`/`CREATOR`/`ADMIN` validados no servidor; rota de admin exige permissão explícita |
| Token roubado ou vazado | Access token curto (15 min); refresh rotativo e revogável; segredos em keystore do dispositivo |
| Senha em texto puro ou banco vazado | Hash Argon2id/BCrypt com salt; nunca logada; política de senha mínima |
| Injeção de SQL | JPA com named parameters; nenhuma concatenação de SQL |
| Mass assignment | DTOs de entrada explícitos; o owner vem do token, nunca do corpo |
| Replay de requisição em falha de rede | `Idempotency-Key` com escopo por usuário e endpoint |
| Prompt injection via IA | Contexto montado pelo backend; IA sem acesso direto ao banco; saída validada contra esquema; IDs inventados rejeitados |
| Prompt injection com efeito de escrita | IA não grava; apenas o usuário confirma; o backend valida toda referência |
| Abuso e custo descontrolado de IA | Rate limiting, cota diária por usuário, timeout, retry limitado, circuit breaker |
| Vazamento de dado sensível em log | Logger com campos sensíveis mascarados; proibido logar corpo de request de IA e transcrição de voz |
| Upload malicioso (fotos, Fase 4) | Validação de tipo real (magic bytes), limite de tamanho, antivírus, URLs assinadas |
| Exfiltração via endpoint público | Autenticação obrigatória em dados privados; CORS restrito; rate limiting |
| Denial of service | Rate limiting, paginação obrigatória, limites de payload, timeout de dependência |

---

## 2. Controles por camada

### 2.1 Aplicativo mobile

- Token de acesso e refresh em `expo-secure-store` (Keychain / Keystore), nunca
  em `AsyncStorage` ou estado global persistido.
- TLS obrigatório; certificate pinning em fase de produção (decisão pendente).
- Dados locais de rascunho criptografados; limpeza no logout.
- Nenhum segredo de servidor no bundle — o app conhece apenas URLs públicas.
- Nenhuma chamada de IA direta do dispositivo: sempre pelo backend.

**Específico de Android (primeiro lançamento):**

- `android:allowBackup="false"` — backup do sistema não deve extrair o
  `SharedPreferences` com token nem o banco SQLite com rascunhos.
- `android:usesCleartextTraffic="false"` — tráfego em texto puro bloqueado.
- Keystore e chave de upload do Play **fora** do repositório e fora da máquina
  de CI, com segredo de CI próprio.
- `android:exported="false"` em toda Activity que não precise ser aberta por
  outro app.
- Tela de bloqueio (`FLAG_SECURE`) avaliada para o registro de treino, caso se
  julgue necessário: dados de saúde do usuário não podem aparecer na lista de
  aplicativos recentes.

### 2.2 Backend

- **Autenticação:** access token JWT stateless de 15 minutos; refresh token
  **opaco** (256 bits aleatórios), rotativo a cada uso, com **detecção de
  reuso**: apresentar um token já revogado revoga a família inteira da sessão.
- **Refresh token no banco:** apenas o **hash SHA-256**. O valor em texto puro
  existe no cliente e na resposta de login — em nenhum outro lugar. Um
  vazamento da tabela não concede acesso a nenhuma sessão.
- **Senhas:** Argon2id com parâmetros OWASP (19 MiB, 2 iterações, 1 paralelismo,
  saída de 32 bytes, salt de 16 bytes). Política: mínimo de 8 caracteres, uma
  letra e um número — a mesma regra no app e na API.
- **Anti-enumeração:** e-mail inexistente e senha errada devolvem a mesma
  resposta e o mesmo tempo de resposta. `forgot-password` responde `202` sempre.
- **Recuperação de acesso:** token de uso único, 30 minutos, armazenado apenas
  como hash. Usar o token encerra as sessões abertas do usuário.
- **Rate limiting** nos endpoints de autenticação, por IP e por e-mail.
- **Idempotência:** `POST /auth/register` aceita `Idempotency-Key` — reenviar a
  mesma requisição não cria duas contas.
- **Autorização:** `authorizeHttpRequests` com escopos explícitos por rota;
  autorização por recurso verificada no serviço, não apenas na rota.
- **Entrada:** Bean Validation em todos os DTOs + regras de domínio.
- **Erros:** handler global com formato único; stack trace, nome de tabela e
  caminho de arquivo nunca chegam ao cliente.
- **Rate limiting:** autenticação, recuperação de senha e todos os endpoints de IA.
- **CORS:** origens explícitas por ambiente.
- **Headers:** `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy` na borda.
- **Logs:** campo `traceId` por requisição; sem senha, token ou dado corporal.
- **Actuator:** endpoints administrativos restritos e fora da exposição da API pública.

### 2.3 Infraestrutura

- Segredos por variável de ambiente ou gerenciador de secrets.
- `.env` real **nunca** versionado — apenas `.env.example` com placeholders.
- Scan automático de segredos no CI (job `secret-scan`).
- PostgreSQL sem exposição pública; volume persistente com backup.
- Imagens Docker executando como usuário não-root.

---

## 3. IA — controles específicos

O requisito mais importante do projeto em termos de segurança:

> **A IA propõe; o backend valida; o usuário revisa e decide.**

| Controle | Detalhe |
|---|---|
| Chave da API | Somente no backend, em variável de ambiente |
| Contexto enviado | Mínimo necessário: preferências, equipamento, restrições ativas, exercício do catálogo, histórico relevante. Nunca senha, token ou foto |
| Saída | DTO com esquema fixo; resposta que não parse ou viola limites é rejeitada (`AI_INVALID_RESPONSE`) |
| Referências | IDs de exercício inventados são descartados; o backend só persiste IDs existentes |
| Escrita | A IA **nunca** grava no banco. O usuário revisa e confirma |
| Limites | Cota por usuário/dia, timeout, retry limitado, circuit breaker |
| Prompt injection | O conteúdo do usuário é delimitado como dado, nunca como instrução; o backend define as regras de saída |
| Alcance clínico | Não diagnostica, não prescreve tratamento, não recomenda suplementação como tratamento, não promete resultado |
| Retenção | Não guardar conversa completa; `ai_recommendations` guarda resumo de entrada e saída estruturada, com política de retenção |
| Treinamento de modelo | Não usar dados pessoais do usuário para treinar modelos sem base legal, transparência e consentimento |

---

## 4. LGPD — checklist

| Item | Status |
|---|---|
| Base legal definida para cada tratamento | Pendente |
| Consentimento explícito para dados sensíveis (restrições, fotos) | Implementado no desenho |
| Finalidade declarada e visível | Implementado no desenho |
| Coleta mínima | Implementado no desenho |
| Consentimento para tratamento e para IA | Pendente |
| Direito de acesso | Implementado (`GET /users/me`) |
| Direito de exportação | Pendente — endpoint de exportação |
| Direito de exclusão | Pendente — rotina de exclusão em cascata |
| Revogação de consentimento | Implementado (`is_active` em restrições) |
| Retenção e descarte automático | Pendente — política a definir |
| Registro de operações de tratamento | Pendente |
| Encarregado (DPO) designado | Pendente |
| Canal de atendimento ao titular | Pendente |

---

## 5. Privacidade por padrão

- Perfil, recordes e publicações são **privados por padrão**. Compartilhamento
  é opt-in e explícito.
- Restrições e medidas são acessíveis apenas pelo titular.
- Recurso de outro usuário responde `404` — a API não confirma nem nega a
  existência de dados alheios.
- A exclusão da conta é definitiva e exige a senha atual: o `DELETE /users/me`
  remove a linha de `users` e a cascata apaga preferências, tokens, programas,
  sessões, séries, recordes, restrições e recomendações de IA. Um access token
  ainda válido (até 15 min) deixa de autenticar de fato e recebe `404`; o
  refresh token é apagado e não renova mais a sessão.
- Admin não tem leitura livre sobre dados de saúde: acesso excepcional,
  justificado e auditado.

---

## 6. Pendências de segurança

| # | Pendência | Situação | Sprint |
|---|---|---|---|
| 1 | Refresh token rotativo com detecção de reuso | **Feito** — tokens persistidos, rotação e revogação em cascata | 2 |
| 2 | Rate limiting com backend compartilhado (Redis) | **Parcial** — limitador em memória nas rotas de autenticação; sem backend compartilhado para múltiplas instâncias | 2 |
| 3 | Recuperação de acesso por email com token de uso único | **Feito** — token de uso único de 30 min; a entrega usa uma porta de e-mail plugável, o provedor real ainda não foi conectado | 2 |
| 4 | Auditoria de ações de administrador | Pendente — ainda não existe painel de administração | 1 |
| 5 | Testes de penetração manuais nos endpoints de IA | Pendente — depende dos endpoints de IA | 5 |
| 6 | Certificate pinning no app | Pendente | 6 |
| 7 | Política de privacidade, termos de uso e encarregado (DPO) | **Parcial** — rascunhos em [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md); falta revisão jurídica, preenchimento dos placeholders, publicação em URL pública e designação do DPO | 6 |
| 8 | Rotação e teste de backup do banco | Pendente | 6 |
| 9 | Política de retenção de dados de IA | Pendente — depende da decisão 3 (provedor e retenção de prompts) | 5 |
| 10 | Exclusão de conta in-app (exigência do Google Play para apps com login) | **Feito** — `DELETE /users/me` exige a senha, apaga em cascata todos os dados do titular e libera o e-mail; tela em Perfil com confirmação em duas etapas. Falta apenas a URL web de solicitação exigida pelo formulário *Data Safety* | 6 |
| 11 | Keystore e chave de upload do Play fora do repositório | Pendente — checklist e comandos em [`PLAY-RELEASE.md`](PLAY-RELEASE.md); a keystore ainda não foi gerada | 6 |

---

## 7. Reporte de vulnerabilidade

Enquanto o projeto não tem canal público, reporte por issue privada no
repositório ou pelo e-mail do mantenedor. Não divulgue detalhes em issue
pública antes de uma correção existir.
