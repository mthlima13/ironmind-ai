# Integração com a autenticação externa — contrato de identidade

> **Status: PROPOSTA.** Nada descrito neste documento está implementado no
> backend. A autenticação atual (JWT local, senha e refresh token) permanece
> ativa até que este contrato seja aprovado.
>
> **Escopo do backend:** remover a autenticação local, ajustar o banco e ler o
> `userUuid` do header. Gateway, autenticação de canal, mTLS, assinatura,
> rate limiting e deploy no cluster **não** fazem parte do backend — são
> premissa e responsabilidade da infraestrutura (seção 3).
>
> Toda afirmação sobre gateway, provedor de identidade, mTLS, assinatura,
> claims ou revogação é **proposta, premissa ou pendência**, não recurso
> existente. O repositório não documenta nenhuma dessas peças de infraestrutura
> (seção 0.4).

Este documento define o contrato necessário para que o backend deixe de
autenticar o usuário e passe a receber a identidade já validada pela
infraestrutura.

---

## 0. Escopo

### 0.1 O que o backend entrega

1. **Remove a autenticação local:** JWT, `/auth/*`, senha, `password_hash`,
   refresh tokens e recuperação de senha.
2. **Muda o banco:** vínculo `identity_subject` e tombstone de conta excluída.
3. **Lê o `userUuid` do header:** um filtro central recebe o identificador já
   resolvido e o coloca no contexto da requisição; nenhum controller ou service
   lê o header diretamente.

### 0.2 O que o backend **não** faz

- Não implementa gateway, mTLS, asserção assinada, nonce ou prova de canal.
- Não valida token, sessão ou revogação no provedor de identidade.
- Não faz rate limiting no gateway.
- Não define topologia, rede, exposição do serviço ou deploy no cluster.
- Não migra a persistência para MongoDB.
- Não altera o aplicativo mobile.

Essas responsabilidades são da infraestrutura. O backend assume que o header só
chega até ele porque o gateway o injetou e porque o serviço não é alcançável
por fora da rede do gateway (seção 3).

### 0.3 As três camadas (não confundir)

| Camada | Onde acontece | O que prova | Situação |
|---|---|---|---|
| **Autenticação do usuário** | Provedor de identidade + gateway | quem é o titular da sessão | **PREMISSA da infraestrutura** — hoje é feita pelo backend com JWT local |
| **Autenticação do canal** | Infraestrutura (gateway e rede) | que a requisição chegou pelo gateway legítimo e que a identidade não foi escrita pelo cliente | **PREMISSA da infraestrutura** — fora do escopo do backend |
| **Autorização de recursos** | Backend | que aquele usuário pode ler, criar, alterar ou excluir aquele recurso | **IMPLEMENTADA** — filtro por proprietário em toda operação |

O backend consome o **resultado** da primeira camada e confia na segunda por
premissa. A terceira não muda: mesmo com identidade verificada, todo acesso
continua sendo filtrado pelo proprietário, e recurso alheio continua
respondendo `404`.

### 0.4 Evidência disponível no repositório

| Evidência | O que é | O que **não** é |
|---|---|---|
| `infra/docker-compose.yml` | Postgres, Redis e backend publicados em `127.0.0.1` | não há gateway, proxy reverso ou provedor de identidade |
| `app.security.trusted-proxies` / `ClientIpResolver` | confiança em `X-Forwarded-For` **apenas** para rate limit por IP | não autentica identidade |
| `server.forward-headers-strategy: framework` | resolução de scheme/host atrás de proxy | não autentica identidade |
| `mobile/src/services/api.ts` | app chama a API diretamente com `Authorization: Bearer` | não existe hop de gateway hoje |
| `docs/SPEC.md` §1.4, §11.1, §14.3 | owner vem da sessão autenticada; exclusão exige senha | não descreve infraestrutura |

**Conclusão:** o produto do gateway, o provedor de identidade, o nome do header
e o formato do `sub` são **desconhecidos** e dependem da infraestrutura. As
seções abaixo propõem o contrato do lado do backend; os pontos abertos estão na
seção 11.

---

## 1. Objetivo

Hoje o backend:

1. emite e valida os próprios tokens (`JwtService`);
2. guarda senha (`users.password_hash`) e tokens de refresh/recuperação;
3. extrai o `userId` do token e o disponibiliza via `SecurityUtils`.

No modelo proposto, a autenticação (login, senha, sessão, emissão e validação
de token) passa a ser responsabilidade da infraestrutura. O backend recebe
apenas o identificador do usuário já autenticado, por um header injetado pelo
gateway.

O backend **continua** responsável por:

- validar o formato e a presença do identificador;
- resolver `subject → users.id` e provisionar o perfil quando necessário;
- decidir o que cada usuário pode ler, criar, alterar e excluir;
- responder `404` para recurso de outro usuário;
- impedir IDOR/BOLA em todas as consultas;
- manter as regras de negócio existentes.

---

## 2. Contrato do header

### 2.1 Nome — **PROPOSTO, PENDENTE**

**Proposta:** `X-IronMind-User-Id`, sempre configurável, nunca codificado em
controllers.

```yaml
# PROPOSTA: esta configuração ainda não existe no backend.
app:
  security:
    identity:
      mode: ${IDENTITY_MODE:jwt}                  # jwt (atual) | header (proposto)
      user-uuid-header: ${IDENTITY_USER_UUID_HEADER:X-IronMind-User-Id}
      # Opcional: usado apenas para step-up na exclusão de conta (seção 7).
      auth-time-header: ${IDENTITY_AUTH_TIME_HEADER:X-IronMind-Auth-Time}
```

Por que um nome próprio: headers genéricos como `X-User-Id` são injetados por
vários proxies e plugins por padrão, o que aumenta o risco de aceitação
acidental. Se a infraestrutura já padronizar outro nome, apenas a configuração
muda.

Alternativas a confirmar: `X-User-Id`, `X-User-Uuid`, `X-Auth-User-Id`.

> Todos os demais headers da integração (timestamp, nonce, assinatura, chave de
> assinatura) pertencem ao canal e **não** são lidos pelo backend. Se a
> infraestrutura os usar, eles são consumidos e removidos pelo próprio gateway.

### 2.2 Header auxiliar — **PROPOSTO, PENDENTE**

| Header | Conteúdo | Uso | Obrigatório |
|---|---|---|---|
| `X-IronMind-User-Id` | UUID canônico do titular | identidade | sim, em rota privada |
| `X-IronMind-Auth-Time` | instante da autenticação no provedor (epoch em segundos ou ISO-8601) | step-up de exclusão de conta | não; se ausente, aplica-se o fallback da seção 7.2 |

Nenhum outro header de identidade é lido. Em particular, o backend não lê e não
confia em `X-Forwarded-User`, `X-User-Id` ou similares.

### 2.3 Validação do valor

| Caso | Resultado |
|---|---|
| Header ausente em rota privada | `401 UNAUTHENTICATED` |
| Header vazio ou só espaços | `401 UNAUTHENTICATED` |
| Não é UUID canônico (`8-4-4-4-12`) | `401 UNAUTHENTICATED` |
| `urn:uuid:...`, entre chaves, sem hífens, com espaços | `401 UNAUTHENTICATED` |
| UUID nil (`00000000-0000-0000-0000-000000000000`) | `401 UNAUTHENTICATED` |
| Hexadecimal em maiúsculas | aceito e normalizado para minúsculas |
| Mais de um valor | `401 UNAUTHENTICATED` |
| Valor com vírgula (duplicatas concatenadas pelo proxy) | `401 UNAUTHENTICATED` |
| UUID válido em rota pública (`GET /exercises`) | ignorado; requisição segue anônima |
| UUID inválido em rota pública | ignorado; requisição segue anônima |

A resposta é sempre `401`, nunca `400`, para não revelar qual regra falhou e
para não executar nenhuma regra de negócio.

### 2.4 Headers duplicados

O filtro central deve usar a API que expõe **todos** os valores do header
(`HttpServletRequest#getHeaders`) e exigir exatamente um. Isso cobre:

- duas linhas com o mesmo nome;
- variações de caixa (headers HTTP não diferenciam maiúsculas de minúsculas,
  e o container expõe todas as ocorrências);
- valores concatenados por proxy (`a, b`), rejeitados pela vírgula.

Rejeitar múltiplos valores no backend é obrigatório mesmo que o gateway já
normalize, porque a garantia do gateway pode regredir sem que ninguém perceba.

### 2.5 Regras de uso

- O UUID é lido **uma única vez**, em um filtro central, e disponibilizado no
  contexto da requisição.
- Nenhum controller, service ou DTO lê o header diretamente.
- O UUID **nunca** é aceito do corpo, da query string, de path parameter ou de
  qualquer outro campo controlado pelo cliente.
- O UUID do header nunca é usado como autorização por si só: toda consulta
  continua filtrando pelo proprietário.
- O identificador não deve ser gravado em log junto de dados pessoais.

### 2.6 Rotas públicas

`GET /api/v1/exercises` e `/api/v1/exercises/**` são públicas hoje. No modelo
proposto:

- sem header, continuam anônimas (catálogo global);
- com header válido, o usuário vê também os próprios exercícios;
- com header inválido, a requisição **não** é bloqueada; segue anônima.

Isso evita que um header malformado derrube o catálogo público e mantém o
comportamento atual de `onlyMine=true`, que já responde `401` quando não há
identidade.

---

## 3. Premissa da infraestrutura (fora do escopo do backend)

### 3.1 O que a infraestrutura precisa garantir

O backend **não implementa** autenticação de canal. Ele confia no header por
premissa. Para que essa confiança seja válida, a infraestrutura precisa
garantir, no ambiente real:

1. O gateway autentica a sessão no provedor de identidade antes de encaminhar
   qualquer requisição.
2. O gateway **remove** qualquer header de identidade enviado pelo cliente e
   injeta o `sub` do token validado (seção 4).
3. O backend **não é alcançável** fora da rede do gateway.
4. Token ausente, inválido, expirado ou revogado não chega ao backend.
5. Gateway e backend não registram token, payload nem identidade com PII.

Como isso é feito (mTLS, rede privada, asserção assinada, service mesh, WAF) é
decisão da infraestrutura e **não** altera o contrato do backend.

### 3.2 Consequência se a premissa falhar

Se o backend for alcançável diretamente, qualquer cliente escreve
`X-IronMind-User-Id` com o UUID de outra pessoa e assume a identidade dela. O
backend não tem como distinguir uma requisição legítima de uma forjada — essa
distinção é exatamente o que a camada de canal fornece, e ela não está no
escopo do backend.

Por isso a verificação dos itens 3.1 é obrigatória **antes** de ativar o modo
`header` em produção, mesmo não sendo código deste repositório.

### 3.3 Evolução futura (não solicitada)

Se a infraestrutura quiser, mais tarde, que o backend valide uma asserção
assinada ou exija mTLS, isso entra como um passo adicional no filtro central.
Não faz parte deste contrato e não deve ser implementado agora.

---

## 4. Falsificação pelo cliente

### 4.1 Divisão de responsabilidade

| Controle | Responsável | Situação |
|---|---|---|
| Remover o header de identidade enviado pelo cliente | Infraestrutura (gateway) | **PREMISSA** — verificar no ambiente real |
| Injetar o `sub` do token validado | Infraestrutura (gateway) | **PREMISSA** |
| Não expor o backend fora da rede do gateway | Infraestrutura | **PREMISSA** |
| Rejeitar header ausente, duplicado, concatenado, vazio, nil ou malformado | Backend | **PROPOSTA** — a implementar |
| Rejeitar identidade de outro usuário no recurso | Backend | **IMPLEMENTADO** — filtro por proprietário, `404` |
| Não gravar identidade com PII em log | Backend | **IMPLEMENTADO** — revisar ao adicionar o filtro |

### 4.2 Exemplo ilustrativo de remoção no gateway

O produto real é **pendente**; o trecho serve apenas para mostrar o que a
infraestrutura precisa fazer:

```nginx
# Remove qualquer tentativa do cliente de definir a identidade.
proxy_set_header X-IronMind-User-Id "";
# Injeta a identidade validada pelo gateway.
proxy_set_header X-IronMind-User-Id $authenticated_user_uuid;
```

A remoção precisa ser explícita e testada no ambiente real (seção 9.2). O
mesmo vale para qualquer gateway escolhido.

> **CORS:** o cliente (inclusive web) não envia o header de identidade; quem o
> adiciona é o gateway. Portanto o backend **não** precisa liberar esse header
> em `Access-Control-Allow-Headers`. Liberá-lo seria desnecessário e criaria a
> impressão de que o cliente pode defini-lo.

---

## 5. Da identidade externa ao usuário interno

### 5.1 `identity_subject` — **PROPOSTO**

Não presumir que o `sub` do provedor seja igual ao `users.id` atual. Proposta:
um campo/coluna `identity_subject`, único, que mapeia o identificador externo
para o usuário interno. Assim:

- contas existentes podem ser vinculadas sem reescrever chaves estrangeiras;
- o filtro resolve `subject → users.id` uma vez por requisição;
- novos usuários podem usar `id = subject` se a migração para MongoDB
  confirmar essa escolha.

Enquanto o formato do `sub` não for confirmado (seção 11, decisão 2), o campo
é tratado como string opaca validada.

### 5.2 Vínculo de contas legadas — **PENDENTE**

Contas criadas pelo cadastro atual têm UUIDs gerados pelo backend. Se o `sub`
do provedor for diferente, é preciso decidir como vinculá-las:

| Alternativa | Risco |
|---|---|
| Vincular no primeiro acesso quando o e-mail verificado do provedor for igual ao e-mail da conta | exige e-mail verificado; sem isso é vetor de takeover |
| Criar conta nova e deixar a antiga órfã | perda de histórico para o usuário |
| Migração assistida pelo suporte | custo operacional |

A vinculação automática, se aprovada, deve ser única, auditada e recusada
quando o provedor não afirmar que o e-mail é verificado.

---

## 6. Provisionamento de usuários

O usuário **não existe** no banco no primeiro acesso. O fluxo não pode
presumir que exista.

### 6.1 Modelos possíveis

| Modelo | Como funciona | Risco |
|---|---|---|
| **Pré-provisionamento** | provedor de identidade ou webhook chama um endpoint interno autenticado no cadastro | acopla o cadastro à disponibilidade do backend |
| **JIT (just-in-time)** | a primeira requisição autenticada cria o perfil | exige claims confiáveis; corrida na primeira chamada |
| **Híbrido** | pré-provisiona quando possível; JIT quando os claims bastam; senão onboarding | mais estados para testar |

**Recomendação: híbrido, com JIT como caminho garantido.** A garantia do JIT
depende dos claims disponíveis (seção 11, decisão 3); a escolha final do
modelo é do produto e da infraestrutura.

### 6.2 Fluxo proposto

1. O gateway autentica a sessão no provedor de identidade e injeta
   `X-IronMind-User-Id` (e `X-IronMind-Auth-Time`, se disponível).
2. O filtro valida formato e unicidade do header.
3. O backend resolve `identity_subject`:
   - **existe** → segue com o `users.id` correspondente;
   - **não existe e não há tombstone** → cria o perfil;
   - **existe tombstone** → `401`/`403` `ACCOUNT_DELETED`, **nunca recria**.
4. Criação do perfil:
   - `id` interno gerado pelo backend (ou igual ao `subject`, se decidido);
   - `identity_subject = sub`;
   - `email` e `name` vindos de claims **verificados**, quando existirem;
   - `role = USER` por padrão;
   - `timezone` padrão;
   - `profile_complete = false` quando faltar dado obrigatório do produto.
5. Concorrência: a criação usa operação atômica
   (`INSERT ... ON CONFLICT DO NOTHING` no PostgreSQL ou upsert por `_id` no
   MongoDB) seguida de releitura. Duas primeiras requisições simultâneas nunca
   podem gerar dois usuários nem `500`.
6. Colisão de e-mail entre subjects diferentes: **não mesclar
   automaticamente**. Responder `409 IDENTITY_CONFLICT` e registrar para
   suporte, porque mesclar contas por e-mail é vetor de account takeover.
7. O onboarding completo (nome, timezone) usa `PATCH /users/me`. O e-mail só
   muda com verificação no provedor; a fonte da verdade é a decisão 4 da seção
   11.

### 6.3 Estados do perfil — **PROPOSTO**

| Estado | Significado | Acesso |
|---|---|---|
| `PROVISIONED` | perfil criado com dados mínimos | endpoints privados liberados |
| `PROFILE_INCOMPLETE` | falta nome/timezone | onboarding; leitura liberada |
| `DELETED` | tombstone ativo | `401`/`403`; nenhum dado recriado |

O estado não substitui a autorização por proprietário: ele apenas decide se o
perfil pode ser usado.

### 6.4 Conta excluída

Excluir a conta no backend não revoga automaticamente a identidade no
provedor. Sem um tombstone, a próxima requisição recriaria o usuário e a
exclusão não teria efeito. Por isso o tombstone é parte do contrato de
provisionamento, não um detalhe da exclusão (seção 7).

---

## 7. Exclusão segura de conta

### 7.1 Problema

Hoje `DELETE /users/me` exige a senha atual como segunda prova de titularidade.
Com a autenticação fora do backend, não há senha para conferir. Aceitar apenas
o header enfraqueceria a operação: um token roubado apagaria a conta e todo o
histórico.

### 7.2 Prova de titularidade proposta

| Mecanismo | Regra | Situação |
|---|---|---|
| **Confirmação explícita** | corpo `{ "confirmation": "EXCLUIR_MINHA_CONTA" }` + UI em duas etapas | **PROPOSTA** — obrigatório |
| **Idempotency-Key** | obrigatório na operação | já é regra do projeto |
| **Autenticação recente (step-up)** | `X-IronMind-Auth-Time` com idade ≤ 5 minutos | **PROPOSTA** — só se o gateway enviar o header |
| **Fallback sem `auth_time`** | o app refaz a autenticação no provedor imediatamente antes da exclusão | **PROPOSTA** — a definir com o app |

Sem confirmação explícita, a operação é recusada com `422`. Se o step-up for
exigido e falhar, a resposta é `401 REAUTH_REQUIRED`; o app refaz o login e
repete.

### 7.3 Ordem da operação (proposta)

1. Validar identidade, formato e, se configurado, idade do `auth_time`.
2. Gravar **tombstone** `{ subject, deleted_at }` — único, sem PII. Ele é a
   âncora de idempotência e o bloqueio de ressurreição.
3. Solicitar a revogação da sessão no provedor de identidade **quando essa
   capacidade existir** (depende da infraestrutura). **PENDENTE.**
4. Se não houver API de revogação: concluir a exclusão local e deixar o
   tombstone ativo; a sessão remanescente no provedor morre no vencimento.
5. Hard delete de `users`, com a cascata atual.
6. Auditar `subject` e resultado; nunca e-mail, nome ou token.
7. Repetição da mesma identidade com tombstone → `204` idempotente. Outra
   identidade → `404`.

### 7.4 Re-provisionamento após exclusão

O tombstone impede recriar o perfil automaticamente. O retorno do titular
exige processo de suporte ou período de carência — decisão de produto e
jurídico (seção 11, decisão 5).

### 7.5 Impacto nos documentos atuais

`docs/SPEC.md` §14.3 e `docs/API.md` descrevem a senha como prova de
titularidade. A alteração só vale depois de aprovada e implementada; até lá,
o comportamento documentado continua sendo o atual.

---

## 8. Modelo de ameaça

| Cenário | Controle | Responsável |
|---|---|---|
| Cliente envia o header de identidade com o UUID de outra pessoa | gateway remove o header do cliente e injeta o `sub` validado | **Infraestrutura** |
| Cliente acessa o backend diretamente | backend fora da exposição pública | **Infraestrutura** |
| Token expirado ou revogado | gateway responde `401` antes do backend | **Infraestrutura** |
| Cliente envia header duplicado ou concatenado | gateway normaliza; backend rejeita múltiplos valores | Compartilhado |
| UUID válido de outro usuário | autorização por proprietário em toda consulta → `404` | **Backend** |
| UUID no corpo da requisição | ignorado; identidade vem só do contexto | **Backend** |
| Header malformado em rota pública | ignorado; catálogo segue anônimo | **Backend** |
| Usuário não provisionado | criação atômica (JIT) ou `404 PROFILE_NOT_FOUND` | **Backend** |
| Duas primeiras requisições simultâneas | upsert atômico + releitura | **Backend** |
| Colisão de e-mail entre subjects | `409 IDENTITY_CONFLICT`; nunca mesclar automaticamente | **Backend** |
| Conta excluída recriada pelo próximo request | tombstone bloqueia o provisionamento | **Backend** |
| Header de identidade presente sem gateway | risco residual aceito pela premissa da seção 3 | **Infraestrutura** |

---

## 9. Testes de aceitação

### 9.1 Backend (automatizáveis sem infraestrutura real)

| # | Cenário | Esperado |
|---|---|---|
| B1 | Sem header em rota privada | `401 UNAUTHENTICATED` |
| B2 | Header duplicado (dois valores) | `401` |
| B3 | Header com vírgula | `401` |
| B4 | UUID malformado, nil ou `urn:uuid:` | `401` |
| B5 | Identidade de A lendo recurso de B | `404` |
| B6 | Identidade A + `userId` de B no corpo | recurso pertence a A |
| B7 | Usuário ainda não provisionado | perfil criado **ou** `404 PROFILE_NOT_FOUND` |
| B8 | Duas primeiras requisições simultâneas | um único usuário, sem `500` |
| B9 | Subject com tombstone | `401`/`403`, sem recriação |
| B10 | `DELETE` sem confirmação explícita | `422` |
| B11 | `DELETE` com confirmação | `204`; segunda chamada `204` |
| B12 | Re-provisionar após exclusão | bloqueado |
| B13 | Rotas públicas com ou sem header inválido | `200`, sem identidade |

A suíte de isolamento existente (`UserIsolationIntegrationTest`) continua
sendo a regressão de autorização e deve ser reexecutada após a migração de
persistência.

### 9.2 Infraestrutura (ambiente real — não é código deste repositório)

| # | Cenário | Esperado |
|---|---|---|
| I1 | `curl` direto no backend, de fora da rede permitida | conexão recusada ou timeout |
| I2 | Header forjado + token válido de A pelo gateway | backend recebe A |
| I3 | Header forjado **sem** token pelo gateway | `401` no gateway |
| I4 | Token de A + header B pelo gateway | backend recebe A |
| I5 | Header duplicado enviado ao gateway | normalizado ou `401` |
| I6 | Token revogado ou expirado | `401` no gateway |
| I7 | Logs do gateway e do backend | sem token, sem payload, sem PII |

I2 e I3 são os testes decisivos: provam que o cliente não consegue substituir a
identidade e que o backend não é alcançável por fora. Devem ser executados pela
infraestrutura antes de ativar o modo `header` em produção.

---

## 10. O que mudaria no backend (fase futura, **não implementada agora**)

1. Um filtro central leria o header, substituindo o filtro JWT apenas no modo
   `header`.
2. `SecurityUtils` passaria a ler o UUID do contexto preenchido por esse filtro;
   os controllers não mudam.
3. `SecurityConfig` manteria as regras de rota e a autorização; só trocaria o
   filtro.
4. `AuthenticatedUser` deixaria de carregar `email`/`role` do token. Papel, se
   necessário, viria de fonte confiável definida na seção 11.
5. Um resolvedor `subject → users.id` e o provisionamento entrariam antes da
   remoção dos endpoints de autenticação.
6. `users.password_hash`, `refresh_tokens`, `password_reset_tokens` e os
   endpoints `/auth/*` sairiam por último, quando o modo `header` estiver
   validado.

Nada disso está autorizado nesta etapa.

---

## 11. Decisões pendentes

| # | Decisão | Responsável | Status |
|---|---|---|---|
| 1 | Nome definitivo do header | Infraestrutura + Backend | **PENDENTE** |
| 2 | Formato e estabilidade do `sub` (é UUID? muda?) | Identidade/Infraestrutura | **PENDENTE** |
| 3 | Claims disponíveis para JIT (`email`, `name` verificados) | Identidade/Infraestrutura | **PENDENTE** |
| 4 | Fonte da verdade de e-mail, nome e papel (`ADMIN`/`CREATOR`) | Produto + Segurança | **PENDENTE** |
| 5 | Período de carência e retenção do tombstone | Produto + Jurídico | **PENDENTE** |

Além dessas, a ativação do modo `header` depende da verificação da premissa da
seção 3 pela infraestrutura (backend não exposto, gateway removendo e
injetando o header). Essa verificação não é uma decisão de produto nem código
do backend.

---

## 12. Documentos relacionados

- [`SPEC.md`](SPEC.md) — requisitos e comportamento atual.
- [`API.md`](API.md) — contrato HTTP e códigos de erro.
- [`SECURITY.md`](SECURITY.md) — modelo de ameaça e controles.
- [`DATA-MODEL.md`](DATA-MODEL.md) — modelo relacional e índices.
