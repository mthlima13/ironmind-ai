# Integração com a autenticação externa — contrato de identidade

> **Status: IMPLEMENTADO no backend.** O serviço não autentica ninguém: lê o
> UUID do usuário no header `X-User-UUID`, injetado pelo gateway, e autoriza
> todo acesso pelo proprietário do recurso.
>
> A autenticação do usuário (login, senha, sessão, emissão e revogação de token)
> é **premissa da infraestrutura**. O backend não valida token, não chama o
> provedor de identidade, não faz mTLS nem verifica assinatura de canal.

Este documento descreve o contrato que o backend consome, o que ele garante e o
que a infraestrutura precisa garantir para que a confiança no header seja
válida.

---

## 0. Escopo

### 0.1 O que o backend faz

1. **Não autentica:** não há JWT, `/auth/*`, senha, refresh token, recuperação
   de acesso, Redis ou tabela de usuário.
2. **Lê a identidade do header:** `IdentityHeaderFilter` valida o UUID e o
   coloca no contexto da requisição; nenhum controller ou service lê o header
   diretamente.
3. **Autoriza por proprietário:** toda consulta de recurso privado filtra pelo
   `userId`; recurso de outro usuário responde `404`.
4. **Não provisiona usuário:** um UUID válido sem dados simplesmente enxerga
   listas vazias. Não há JIT, tombstone ou `identity_subject`.
5. **Não expõe conta:** não existe `GET/PATCH/DELETE /users/me`, perfil,
   preferências ou exclusão in-app.

### 0.2 O que o backend **não** faz

- Não implementa gateway, mTLS, asserção assinada, nonce ou prova de canal.
- Não valida token, sessão ou revogação no provedor de identidade.
- Não faz rate limiting na borda.
- Não define topologia, rede, exposição do serviço ou deploy no cluster.
- Não guarda PII do titular (nome, e-mail, papel, fuso, unidades).
- Não altera o aplicativo mobile.

---

## 1. As três camadas

| Camada | Onde acontece | O que prova | Situação |
|---|---|---|---|
| **Autenticação do usuário** | Provedor de identidade + gateway | quem é o titular da sessão | **PREMISSA da infraestrutura** |
| **Autenticação do canal** | Infraestrutura (gateway e rede) | que a requisição chegou pelo gateway legítimo e que a identidade não foi escrita pelo cliente | **PREMISSA da infraestrutura** |
| **Autorização de recursos** | Backend | que aquele usuário pode ler, criar, alterar ou excluir aquele recurso | **IMPLEMENTADA** — filtro por proprietário em toda operação |

O backend consome o **resultado** da primeira camada e confia na segunda por
premissa. A terceira não muda: mesmo com identidade verificada, todo acesso
continua sendo filtrado pelo proprietário, e recurso alheio continua
respondendo `404`.

---

## 2. Contrato do header

### 2.1 Nome

Padrão: **`X-User-UUID`**, configurável por:

```yaml
app:
  security:
    identity:
      user-uuid-header: ${USER_UUID_HEADER:X-User-UUID}
```

O nome é decidido pela infraestrutura; trocar o valor da variável basta. O
header **não** é liberado em `Access-Control-Allow-Headers`: quem o adiciona é o
gateway, nunca o cliente.

### 2.2 Validação do valor

| Caso | Resultado em rota privada |
|---|---|
| Header ausente | `401 UNAUTHENTICATED` |
| Header vazio ou só espaços | `401 UNAUTHENTICATED` |
| Não é UUID canônico (`8-4-4-4-12`) | `401 UNAUTHENTICATED` |
| `urn:uuid:...`, entre chaves, sem hífens, com espaços | `401 UNAUTHENTICATED` |
| UUID nil (`00000000-0000-0000-0000-000000000000`) | `401 UNAUTHENTICATED` |
| Hexadecimal em maiúsculas | aceito e normalizado para minúsculas |
| Mais de um valor (duas linhas ou concatenado por vírgula) | `401 UNAUTHENTICATED` |
| UUID válido em rota pública (`GET /exercises`) | ignorado; requisição segue anônima |
| UUID inválido em rota pública | ignorado; requisição segue anônima |

A resposta é sempre `401`, nunca `400`, para não revelar qual regra falhou e
para não executar nenhuma regra de negócio.

### 2.3 Regras de uso

- O UUID é lido **uma única vez**, em um filtro central, e disponibilizado no
  contexto da requisição.
- Nenhum controller, service ou DTO lê o header diretamente.
- O UUID **nunca** é aceito do corpo, da query string, de path parameter ou de
  qualquer outro campo controlado pelo cliente.
- O UUID do header não é autorização por si só: toda consulta continua
  filtrando pelo proprietário.
- O identificador não é gravado em log junto de dados pessoais.

### 2.4 Rotas públicas

`GET /api/v1/exercises` e `/api/v1/exercises/**`, além de `/api/v1/health`, são
públicas:

- sem header, continuam anônimas (catálogo global);
- com header válido, o usuário vê também os próprios exercícios;
- com header inválido, a requisição **não** é bloqueada; segue anônima.

Isso evita que um header malformado derrube o catálogo público.

---

## 3. Premissa da infraestrutura

### 3.1 O que a infraestrutura precisa garantir

1. O gateway autentica a sessão no provedor de identidade antes de encaminhar
   qualquer requisição.
2. O gateway **remove** qualquer header de identidade enviado pelo cliente e
   injeta o UUID do titular validado.
3. O backend **não é alcançável** fora da rede do gateway.
4. Token ausente, inválido, expirado ou revogado não chega ao backend.
5. Gateway e backend não registram token, payload nem identidade com PII.

Como isso é feito (mTLS, rede privada, asserção assinada, service mesh, WAF) é
decisão da infraestrutura e **não** altera o contrato do backend.

### 3.2 Consequência se a premissa falhar

Se o backend for alcançável diretamente, qualquer cliente escreve
`X-User-UUID` com o UUID de outra pessoa e assume a identidade dela. O backend
não tem como distinguir uma requisição legítima de uma forjada — essa distinção
é exatamente o que a camada de canal fornece.

Por isso a verificação dos itens 3.1 é obrigatória **antes** de expor o serviço
em produção, mesmo não sendo código deste repositório.

### 3.3 Exemplo ilustrativo de remoção no gateway

```nginx
# Remove qualquer tentativa do cliente de definir a identidade.
proxy_set_header X-User-UUID "";
# Injeta a identidade validada pelo gateway.
proxy_set_header X-User-UUID $authenticated_user_uuid;
```

A remoção precisa ser explícita e testada no ambiente real (seção 5.2).

---

## 4. Da identidade ao dono do recurso

O UUID do header é o `userId` de todos os documentos privados. Não há resolução
`subject → users.id` nem criação de perfil:

| Situação | Comportamento |
|---|---|
| UUID válido, com dados | o usuário vê apenas os próprios dados |
| UUID válido, sem dados | listas vazias; criar o primeiro recurso funciona |
| UUID de outro titular em path | `404 NOT_FOUND` |
| `userId` no corpo da requisição | ignorado; o dono vem do contexto |
| Header ausente em rota privada | `401 UNAUTHENTICATED` |

Consequências de projeto:

- **Sem JIT:** não existe perfil para criar. O serviço não guarda nome, e-mail,
  papel, fuso, unidades ou objetivo.
- **Sem tombstone:** a conta é do provedor de identidade. Depois que ele a
  encerra, o UUID não deve mais ser injetado; se for, o titular vê um histórico
  vazio. Bloquear a recriação é papel do IdP.
- **Sem preferências no banco:** o contexto de IA usa os padrões documentados
  (objetivo `GENERAL`, experiência `BEGINNER`, 3 dias, sem filtro de
  equipamento).
- **Sem endpoint de conta:** perfil, preferências e exclusão pertencem ao IdP.

### 4.1 Exclusão dos dados do titular

O backend não expõe exclusão de conta. O fluxo é:

1. o IdP encerra a conta e invalida a sessão;
2. o edge (ou rotina administrativa) remove os documentos com o `userId` nas
   coleções listadas em
   [`DATA-MODEL.md` §8](DATA-MODEL.md#8-exclusão-dos-dados-do-titular);
3. exercícios personalizados do titular também são removidos; o catálogo global
   permanece.

---

## 5. Testes de aceitação

### 5.1 Backend (cobertos pela suíte)

| # | Cenário | Esperado | Cobertura |
|---|---|---|---|
| B1 | Sem header em rota privada | `401 UNAUTHENTICATED` | `IdentityHeaderFilterTest`, `test_identity.py` |
| B2 | Header duplicado (dois valores) | `401` | idem |
| B3 | Header com vírgula | `401` | idem |
| B4 | UUID malformado, nil ou `urn:uuid:` | `401` | idem |
| B5 | Identidade de A lendo recurso de B | `404` | `test_identity.py` |
| B6 | Identidade A + `userId` de B no corpo | recurso pertence a A | `test_identity.py` |
| B7 | UUID válido sem dados | listas vazias, sem `401` | `test_health.py` |
| B8 | Rotas públicas com ou sem header inválido | `200`, sem identidade | `test_health.py` |
| B9 | Corpo sem `userId` em qualquer DTO | aceito; dono vem do header | `test_identity.py` |

A regressão de autorização é executada em
[`tests/integration/`](../tests/integration/) contra a stack do compose. Não há
teste de integração em JUnit: o backend só tem testes unitários.

### 5.2 Infraestrutura (ambiente real — não é código deste repositório)

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
infraestrutura antes de ativar o serviço em produção.

---

## 6. Decisões da infraestrutura

| # | Decisão | Responsável | Status |
|---|---|---|---|
| 1 | Nome definitivo do header | Infraestrutura | Configurável (`USER_UUID_HEADER`); padrão `X-User-UUID` |
| 2 | Formato do identificador | Identidade/Infraestrutura | **UUID canônico**, exigido pelo filtro |
| 3 | Fonte da verdade de e-mail, nome e papel | Produto + Segurança | Fora do backend — pertence ao IdP |
| 4 | Exclusão da conta e retenção dos dados | Produto + Jurídico | Fora do backend — IdP/edge |
| 5 | Verificação da premissa de rede e de injeção do header | Infraestrutura | **Pendente — bloqueia produção** |

---

## 7. Documentos relacionados

- [`SPEC.md`](SPEC.md) — requisitos e comportamento atual.
- [`API.md`](API.md) — contrato HTTP e códigos de erro.
- [`SECURITY.md`](SECURITY.md) — modelo de ameaça e controles.
- [`DATA-MODEL.md`](DATA-MODEL.md) — coleções, índices e exclusão de dados.
