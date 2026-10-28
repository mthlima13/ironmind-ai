# Testes de integração

Suíte em Python que valida o contrato da API de ponta a ponta contra um ambiente real
(`docker compose`), sem tocar no código Java nem no MongoDB. Ela cobre o contrato
descrito em `docs/API.md` e as regras de isolamento entre usuários do `docs/SECURITY.md`.

## O que é validado

| Arquivo | Cobertura |
|---|---|
| `test_health.py` | health público, catálogo público, `onlyMine`, paginação, ausência de endpoints de autenticação/perfil |
| `test_identity.py` | o UUID do cabeçalho é o dono de tudo; recurso de outro usuário responde `404` |
| `test_programs.py` | criação, substituição integral, arquivamento, validações e idempotência |
| `test_sessions.py` | ciclo de vida da sessão, cópia do dia do programa, exercícios e listagem |
| `test_sets.py` | registro, numeração, correção, exclusão e idempotência durável |
| `test_records.py` | recordes recalculados pelo servidor (Brzycki, carga, repetições) |
| `test_analytics.py` | resumo semanal em UTC e evolução por exercício |
| `test_restrictions.py` | restrições por lesão e bloqueio da sugestão de carga |
| `test_ai.py` | proposta, decisão, sugestão de carga, coaching, voz e rate limit |

## Como rodar

Na raiz do repositório:

```bash
cd infra
docker compose up -d --build          # MongoDB (replica set) + API
docker compose --profile test run --rm tests
```

O serviço `tests` usa `python:3.12-slim`, instala `requirements.txt` e roda `pytest`.
A API é acessada pela rede interna do compose, com `BASE_URL=http://api:8080`.

Para rodar contra uma API já publicada em outra máquina/porta, sem o compose:

```bash
cd tests/integration
pip install -r requirements.txt
BASE_URL=http://localhost:8080 USER_UUID_HEADER=X-User-UUID pytest -q
```

## Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `BASE_URL` | `http://localhost:8080` | endereço da API |
| `USER_UUID_HEADER` | `X-User-UUID` | nome do cabeçalho injetado pelo gateway |
| `READY_TIMEOUT_SECONDS` | `240` | tempo máximo de espera pelo health check |

## Isolamento

Cada teste recebe uma identidade nova (UUID aleatório), então os dados criados por um
teste nunca aparecem em outro. Nenhum teste depende de ordem de execução.
