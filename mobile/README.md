# IronMind AI — aplicativo mobile

Aplicativo de treinamento físico do **IronMind AI**, escrito em **Expo + React Native + TypeScript** com **Expo Router**.

> **Plataforma do primeiro lançamento: Android.** O iOS está planejado para uma
> fase posterior e **não** faz parte deste ciclo. O código continua agnóstico de
> plataforma (não existe nenhum `Platform.OS === 'ios'` no produto), e o projeto
> usa apenas APIs que continuam suportadas no iOS. Ver
> [seção 1.5 da SPEC](../docs/SPEC.md).

---

## 1. Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 20 ou superior (validado em 24.13) | — |
| npm | 10 ou superior (validado em 11.6) | `bun` também funciona |
| JDK | 17 | necessário apenas para build nativo (`expo run:android`) |
| Android SDK | API 35 (Android 15) | o Play exige `targetSdkVersion` 35+ |
| Emulador ou aparelho Android | API 26 (8.0) ou superior | ver a matriz de validação |

Para usar o **Expo Go** basta o SDK do Android. Para gerar o development build
(`npx expo run:android`) é necessário o Android Studio com o SDK e o emulador
instalados.

---

## 2. Como rodar

```bash
cd mobile
npm install
npx expo start
```

No terminal do Metro:

- `a` — abre o app no **Android** (emulador ou aparelho conectado via ADB);
- `r` — recarrega o app;
- `j` — abre o debugger.

Outros comandos úteis:

```bash
npx expo run:android          # compila e instala um development build nativo
npx expo start --clear        # limpa o cache do Metro
```

### Backend: mock ou real?

O app **não precisa de backend para funcionar**. Sem servidor, ele usa um
adaptador de mock embutido (`src/services/mockAdapter.ts`) que implementa os
mesmos contratos descritos na SPEC (paginação do Apêndice A.2, formato de erro
do A.1, autenticação do A.4 e idempotência do A.3).

O mock também implementa o fluxo de sessão completo: cadastro (com
`Idempotency-Key`), login, renovação, logout com revogação e recuperação de
acesso. A conta de demonstração do mock é `alex@ironmind.ai` com a senha
`ironmind123` — qualquer outra conta pode ser criada pela tela de cadastro.

Para apontar para o backend real, copie `.env.example` para `.env` e ajuste:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_USE_MOCK_API=false
```

> `.env` nunca é versionado. Somente valores públicos de build ficam no bundle.

### Link profundo de recuperação de senha

O e-mail de recuperação aponta para `ironmind://reset-password?token=...`
(rota `app/reset-password.tsx`, esquema `ironmind` em `app.json`). O token é
de uso único e vale 30 minutos; quando o link chega expirado ou já usado, a
tela explica que é preciso pedir um novo.

> O link também é aceito na forma `ironmind:///reset-password?token=...`.

### Ícones do Android

Os assets do launcher são gerados por script, sem dependência nativa:

```bash
node scripts/generate-assets.mjs
```

---

## 3. Testes e qualidade

```bash
npx tsc --noEmit     # checagem de tipos (strict: true)
npx jest              # suíte de testes
npx eslint .         # lint
```

A suíte cobre, entre outras coisas:

| Arquivo | O que verifica |
|---|---|
| `__tests__/setLogger.test.tsx` | componente de registro de série: adicionar/remover série, **usar valores da última sessão**, conversão de unidade, validação de carga/reps/RPE |
| `__tests__/apiError.test.ts` | mapeamento de erro da API no formato do Apêndice A.1 e códigos do A.5, incluindo os códigos de autenticação |
| `__tests__/authSession.test.ts` | renovação automática do token, limpeza da sessão quando o refresh é recusado, `Idempotency-Key` no cadastro e logout com revogação |
| `__tests__/passwordRecovery.test.tsx` | telas de recuperação de acesso: renderização, validação, envio e token inválido |
| `__tests__/mockAuth.test.ts` | contrato dos endpoints de autenticação do adaptador de mock |
| `__tests__/deepLink.test.ts` | link profundo de recuperação de senha (`ironmind://reset-password?token=...`) |
| `__tests__/emptyState.test.tsx` | estado vazio com ação de primeiro uso |
| `__tests__/backHandler.test.tsx` | gesto de back do Android e confirmação obrigatória com sessão em andamento |
| `__tests__/screen.test.tsx` | renderização de tela com `useSafeAreaInsets` mockado |
| `__tests__/authValidation.test.ts` | validação dos formulários de login, cadastro e recuperação |

---

### Teste de contrato contra a API real

Além da suíte com mock, existe um contrato que fala com um backend de verdade.
Ele é **opt-in**: sem `IT_API_URL` a suíte é pulada e o `npx jest` continua
hermético.

```bash
# backend rodando
cd backend && mvn spring-boot:run          # em outro terminal
cd mobile
IT_API_URL=http://localhost:8080/api/v1 npx jest apiContract
```

O que ele prova, contra a API real:

| Cenário | Esperado |
|---|---|
| Cadastro | `201` com access token, refresh token e usuário |
| Senha fraca | `422` com o detalhe por campo (`password`) |
| Login | `200` e perfil aninhado com `privacySettings` normalizado |
| Atualização parcial | campo omitido mantém o valor anterior |
| `userId` no corpo | ignorado; o perfil continua sendo o do token |
| Catálogo | envelope paginado do Apêndice A.2 |
| Renovação | token novo, e o antigo é recusado (`INVALID_REFRESH_TOKEN`) |
| Reuso | a família inteira de tokens é revogada |
| Logout | `204` e a sessão não renova mais |
| Sem token | `401` |

O projeto de Jest do contrato roda em ambiente Node, com a condição de
exportação `node`: sob o preset do React Native o Axios resolve para o build de
browser, que não tem o adapter HTTP, e toda requisição volta vazia.

### Emulador Android local

O SDK e o emulador não fazem parte do projeto, mas o fluxo é este:

```bash
# 1. SDK (uma vez)
sdkmanager "platform-tools" "platforms;android-35" "emulator" \
          "system-images;android-35;google_apis;x86_64"

# 2. AVD
avdmanager create avd -n ironmind_api35 \
  -k "system-images;android-35;google_apis;x86_64" -d pixel_6

# 3. Emulador
emulator -avd ironmind_api35 -no-snapshot -gpu swiftshader_indirect &

# 4. App
npx expo start --android
```

Dois detalhes que só aparecem no emulador:

- **A URL do Metro.** O Expo abre o projeto pelo IP que ele detecta na máquina.
  Em uma máquina com WSL, esse IP não é alcançável pelo emulador. Abra o app
  apontando para o loopback do host: `adb shell am start -a android.intent.action.VIEW -d "exp://10.0.2.2:8081"`.
- **A URL da API.** O emulador enxerga o host em `10.0.2.2`, e é o que está em
  `.env`. Um aparelho físico na mesma rede precisa do IP da LAN.

> O `expo-sqlite` não existe em toda build do Expo Go. O app carrega o módulo
> de forma preguiçosa e trata a ausência: uma feature opcional nunca impede o
> app de abrir.

## 4. Estrutura de pastas

```text
mobile/
├── app/                        # rotas do Expo Router
│   ├── _layout.tsx             # providers (QueryClient, auth, fontes), Stack, back handler
│   ├── auth/                   # grupo de autenticação (login, cadastro e recuperação)
│   ├── reset-password.tsx      # rota do link profundo de recuperação de senha
│   ├── coach.tsx               # placeholder do chat de IA (Fase 2)
│   └── (tabs)/
│       ├── _layout.tsx         # as 5 abas da SPEC 15.1
│       ├── index.tsx           # Início — dashboard
│       ├── treinos.tsx         # Treinos — programas e catálogo
│       ├── comecar.tsx         # Começar — sessão ativa e registro de séries
│       ├── evolucao.tsx        # Evolução — gráficos, volume, recordes, histórico
│       └── perfil.tsx          # Perfil — preferências, restrições, privacidade
├── src/
│   ├── components/             # Button, Card, Screen, EmptyState, ErrorState,
│   │                           # LoadingState, PendingSyncBanner, SetRow, TextField, ...
│   ├── features/
│   │   ├── auth/               # store, hooks, validação e telas de acesso
│   │   ├── workouts/           # sessão, SetLogger e sincronização offline
│   │   ├── exercises/          # busca e filtro do catálogo
│   │   ├── programs/           # editor de programa (dias → exercícios → séries)
│   │   ├── analytics/          # dashboard, evolução por exercício e recordes
│   │   ├── coach/              # placeholder do chat de IA
│   │   ├── profile/            # restrições do usuário
│   │   └── voice/              # estrutura de permissões de câmera/microfone (Fase 2)
│   ├── hooks/                  # fontes, conexão e persistência da sessão
│   ├── mocks/                  # dados estáticos usados pelo backend de mentira
│   ├── navigation/             # linking config, link profundo e handler do back do Android
│   ├── services/               # api.ts (axios + erros + renovação do token),
│   │                           # endpoints.ts, sessionEvents.ts, permissões
│   ├── storage/                # secureStore (token) e SQLite (fila offline)
│   ├── theme.ts                # cores, espaçamento e tipografia
│   ├── types/                  # tipos espelhando o modelo de dados da SPEC 10
│   └── utils/                  # unidades (kg ⇄ lb) e chaves de idempotência
├── __tests__/                  # suíte de testes
├── __mocks__/                  # mock do expo-router para os testes
├── assets/                     # ícones do Android (gerados por script)
├── scripts/                    # gerador dos assets
├── app.json                    # configuração do app (Android only)
└── package.json
```

---

## 5. Adaptações Android (SPEC 15.5)

| Item | Como foi resolvido |
|---|---|
| Gesto de back do sistema | `src/navigation/BackHandlerProvider.tsx`: telas empilhadas voltam; a tela inicial pede confirmação; com sessão em andamento a confirmação é obrigatória |
| Back preditivo (Android 13+) | `android.predictiveBackGestureEnabled: true` no `app.json` |
| Edge-to-edge (Android 15) | `android.edgeToEdgeEnabled: true` + `SafeAreaProvider` e `useSafeAreaInsets` em todas as telas |
| Barra de status | `expo-status-bar` com `style="light"` sobre o fundo grafite |
| Teclado | `KeyboardAvoidingView` nos formulários de acesso, de sessão e de registro de série |
| Permissões em runtime | `expo-notifications` com verificação e solicitação no momento do uso, com fallback (`src/services/permissions.ts`) |
| Câmera e microfone | estrutura pronta em `src/features/voice/voicePermissions.ts`; a feature de voz é da Fase 2 e **não** está implementada |
| Tela pequena | layout fluido, sem altura fixa que corte conteúdo; escala de fonte do sistema respeitada |
| Toque | alvo mínimo de 44 dp em todas as ações durante o treino |

---

## 6. Matriz de validação Android (SPEC 16.5)

Cobertura mínima esperada em cada release:

| Dimensão | Cobertura |
|---|---|
| Versão | API 26 (8.0) até a mais recente estável |
| Fabricante | Google Pixel + ao menos um Android de marca (Samsung, Motorola, Xiaomi) |
| Tela | 5" (compacto) e 6.7"+ (notch/punch-hole) |
| Navegação | gesto de back e botão físico de back |
| Multitarefa | divisão de tela e retorno do app em background |
| Ciclo de vida | foreground/background durante uma sessão de treino em andamento |
| Rede | 2G/lenta, offline e reconexão, com fila de sincronização |
| Persistência | fechar e reabrir o app com sessão em andamento |
| Fontes | escala de fonte no maior valor do sistema |
| Acessibilidade | TalkBack, contraste e alvo de toque |

> **Execução parcial registrada.** A matriz foi executada em um emulador
> Android 15 (API 35, x86_64, perfil Pixel 6), com o app conectado à API e ao
> banco reais: cadastro pela interface, navegação entre as cinco abas, leitura
> do catálogo e do perfil vindos do backend.
>
> Ainda **não** foram verificados: aparelho físico de outra marca, tela de 5
> polegadas, modo multi-janela, TalkBack, escala máxima de fonte e o ciclo
> completo de vida da sessão com o app em background.


---

## 7. Build de release (AAB)

Distribuição em **Android App Bundle** pelo Play Console.

Com EAS Build:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile production
```

Com Gradle local:

```bash
npx expo prebuild --platform android
cd android
./gradlew bundleRelease
```

O AAB gerado fica em `android/app/build/outputs/bundle/release/`.

> **A chave de upload e o keystore nunca entram no repositório.** O
> `keystore.properties`, o `.jks` e o `google-services.json` são mantidos
> fora do versionamento e injetados no build por variáveis de ambiente ou por
> um `keystore.properties` local ignorado pelo Git.

---

## 8. O que está implementado

**Autenticação (RF-001)**
- Telas de login e cadastro com validação de formulário (e-mail, senha com no
  mínimo 8 caracteres, letra e número, confirmação de senha).
- Estado global com Zustand; token e refresh token guardados em
  `expo-secure-store`; `logout` apaga o token e a fila local.
- Sessão restaurada ao abrir o app.
- **Renovação automática:** um `401` em uma requisição privada dispara
  `POST /auth/refresh`, guarda o novo par de tokens e **repete a requisição
  original** (uma tentativa de renovação por requisição). Se o refresh token
  for recusado, os tokens são apagados, a sessão é encerrada e o app volta
  para a tela de login sem travar a tela.
- **Logout com revogação:** `POST /auth/logout` revoga a família de refresh
  tokens no servidor (a detecção de reuso depende disso). A sessão local é
  encerrada **mesmo sem rede**.
- **Idempotência no cadastro:** o `register` envia o header `Idempotency-Key`.
  Uma falha de rede seguida de "tentar de novo" reusa a mesma chave e **não
  cria duas contas**.
- **Recuperação de acesso:** tela "esqueci minha senha" (a resposta é sempre a
  mesma, exista o e-mail ou não — anti-enumeração) e tela "definir nova
  senha", aberta pelo link profundo `ironmind://reset-password?token=...`
  (o token é de uso único e vale 30 minutos).
- Códigos de erro de autenticação da API mapeados no app: `EMAIL_ALREADY_IN_USE`,
  `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN` e `INVALID_RESET_TOKEN`.

**Dashboard (RF-015)**
- Resumo da semana: volume, sessões, recordes, tempo médio, comparação com a
  semana anterior, gráfico de atividade por dia e últimas sessões.

**Catálogo de exercícios (RF-003)**
- Busca por nome/equipamento e filtro por grupo muscular, com estados de
  carregamento, erro com retry e vazio.

**Programas (RF-005)**
- Lista de programas com dias; editor de dia com nome, exercícios, séries alvo,
  faixa de repetições, descanso e ordenação.

**Sessão e registro de série (RF-006, RF-008, RF-010)**
- Início, escolha do dia, listagem dos exercícios da sessão e finalização.
- `SetLogger` com carga, repetições e RPE opcional, contador de séries,
  validação por linha e **atalho "usar valores da última sessão"**.
- Conversão de unidade na fronteira de apresentação (kg ⇄ lb); o valor
  gravado é sempre em kg.

**Histórico, volume e recordes (RF-011, RF-014)**
- Histórico paginado com "carregar mais", lista de recordes e evolução por
  exercício. Os números vêm do servidor — o app **não calcula** volume, 1RM nem
  recordes.

**Perfil e privacidade (RF-002, RF-016)**
- Unidade, experiência, objetivo, limitações informadas e controles de
  privacidade.

**Estados obrigatórios (SPEC 15.4)**
- `LoadingState`, `ErrorState` (com retry), `EmptyState` (com ação de primeiro
  uso) e `PendingSyncBanner` (offline / pendente de sincronização).

**Offline (SPEC 13)**
- Fila de operações pendentes em SQLite (`expo-sqlite`), rascunho da sessão em
  andamento e banner avisando o usuário.

**Chat de IA**
- Apenas a **entrada** para o chat existe (acesso a partir de Treinos e
  Evolução). A feature em si é da Fase 2 e está claramente marcada como
  planejada.

---

## 9. O que está planejado e **não** implementado

| Item | Situação |
|---|---|
| Backend real (Spring Boot) | o backend existe em [`../backend`](../backend), mas o app ainda não consome a API real: usa o mock embutido. Faltam os endpoints de programas, sessões e séries (Sprint 3) |
| Criar/editar/excluir programas pela API | o editor funciona em memória; falta o `PUT /programs/{id}` no backend |
| Exercício personalizado do usuário (RF-004) | não implementado |
| Corrigir/excluir série já registrada (RF-009) | não implementado |
| Pausar/retomar/abandonar sessão | não implementado (a sessão é iniciada e finalizada) |
| Envio real do e-mail de recuperação | a tela e o contrato da API existem, mas **a entrega do e-mail é do backend** (porta de e-mail plugável, SPEC 14.1) |
| Estimativa de 1RM e volume calculados no app | **por decisão** — o cálculo é do backend (SPEC 1.4) |
| Geração de programa por IA (RF-018) | Fase 2 |
| Sugestão de carga (RF-019) | Fase 2 |
| Chat de coaching (RF-020) | Fase 2 — apenas o placeholder de navegação |
| Registro por voz (RF-021) | Fase 2 — apenas a estrutura de permissões |
| Sincronização completa e resolução de conflitos (RF-022) | parcial: existe a fila e o rascunho, não há o envio automático |
| Comunidade, gamificação e moderação (RF-023 a RF-025) | Fase 3 |
| Cardio, medidas corporais, device health (RF-026 a RF-029) | Fase 4 |
| Análise visual assistida por IA (RF-030) | Fase 4 |
| Exportação e exclusão de dados pelo usuário (RNF-017) | não implementado |
| Execução da matriz de validação Android | não executada (sem SDK/emulador neste ambiente) |

---

## 10. Limitações conhecidas

- O app **não fala com um backend real** ainda: o adaptador de mock em
  `src/services/mockAdapter.ts` cobre autenticação (cadastro, login, renovação,
  logout e recuperação de acesso), perfil, exercícios, programas, sessões,
  séries, analytics, recordes e restrições. O backend Spring Boot existe em
  [`../backend`](../backend), mas só expõe o catálogo de exercícios e o health
  neste momento.
- A fila offline **grava** as operações pendentes, mas o envio automático
  quando a conexão volta ainda não foi implementado.
- A tela de programa edita o dia **em memória**: as mudanças não são
  persistidas no backend.
- O chat de IA é um placeholder honesto, sem chamadas de IA.
- A **entrega do e-mail** de recuperação de acesso é do backend: o app só
  chama `POST /auth/forgot-password` e mostra sempre a mesma resposta.
- A renovação automática do token foi exercitada com um adapter falso do
  axios nos testes; o comportamento real depende do backend aceitar o
  `Idempotency-Key` e o refresh token rotativo como descrito na SPEC.
