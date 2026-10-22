# AGENTS.md — instruções para agentes de IA neste repositório

Leia isto antes de escrever qualquer código. As regras aqui são
**inegociáveis** e valem para qualquer ferramenta de IA (Cursor, Copilot,
Antigravity, Claude Code, Gemini CLI, Cline, etc.).

---

## Ordem de leitura obrigatória

1. `docs/SPEC.md` — a especificação canônica do produto.
2. `CONTRIBUTING.md` — convenções de código, idioma e testes.
3. O código existente da pasta que você vai tocar.

Não implemente de memória. A spec mudou o tempo suficiente vezes para que
qualquer pressuposto herdado de conversa anterior esteja errado.

---

## Regras que não podem ser violadas

| # | Regra |
|---|---|
| 1 | Código e comentários em **inglês**. Docs em **português**. |
| 2 | **Nunca** commitar `.env`, chave de API, token ou senha. Use `.env.example`. |
| 3 | Cálculos de volume, 1RM e recordes ficam **no backend**. |
| 4 | A IA **nunca** grava no banco e **nunca** inventa ID de exercício. |
| 5 | `user_id` vem do token, **nunca** do corpo da requisição. |
| 6 | Recurso de outro usuário responde **404**, não 403. |
| 7 | Toda escrita que cria registro aceita `Idempotency-Key`. |
| 8 | Migration Flyway publicada é **imutável**. |
| 9 | Toda regra de domínio nova vem com teste. |
| 10 | Não escreva no README que algo está implementado sem estar. |
| 11 | O alvo do primeiro lançamento é **Android**. Não introduza dependência de iOS, mas mantenha o código agnóstico de plataforma. |

---

## Onde mexer em cada tarefa

| Tarefa | Onde |
|---|---|
| Novo endpoint | `backend/.../<dominio>/` + `docs/API.md` + teste |
| Nova regra de negócio | `backend/.../<dominio>/` + teste unitário |
| Mudança de schema | `backend/src/main/resources/db/migration/V<n+1>__.sql` + `docs/DATA-MODEL.md` |
| Nova tela | `mobile/app/` + `mobile/src/features/<feature>/` + `src/theme.ts` |
| Mudança de regra de IA | `backend/.../ai/` + `docs/SPEC.md` §12 |
| Mudança de requisito | `docs/SPEC.md` primeiro, código depois |

---

## Checklist antes de declarar pronto

- [ ] `cd backend && mvn clean verify` passa
- [ ] `cd mobile && npx tsc --noEmit && npx jest` passa
- [ ] Nenhum `console.log` ou `System.out.println` esquecido
- [ ] Nenhum segredo no código ou em arquivo novo
- [ ] Nenhum TODO sem issue referenciada
- [ ] Documentação atualizada se o contrato mudou
- [ ] Commit e PR descrevem a realidade, não a intenção

---

## Quando em dúvida

Prefira a opção que **mantém o histórico imutável**, **mantém o cálculo no
backend** e **não expõe dado de outro usuário**. Na dúvida, pergunte em vez de
inventar regra de domínio.
