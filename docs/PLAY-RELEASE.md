# Publicação no Google Play — pendências da Sprint 6

Este documento é o checklist **real** da decisão 13 da
[`SPEC.md`](SPEC.md#20-decisões-pendentes) e dos requisitos de publicação da
[seção 14.4](SPEC.md#144-conformidade). Ele separa o que **já está no
repositório** do que **depende de ação humana fora dele** (conta, keystore,
URL pública, revisão jurídica).

> **Estado em 22 de outubro de 2026.** A exclusão de conta in-app está
> implementada e testada. Política de privacidade e termos de uso existem apenas
> como rascunho em [`PRIVACY.md`](PRIVACY.md) e [`TERMS.md`](TERMS.md): **não
> foram revisados juridicamente nem publicados**. Não há keystore, conta de
> desenvolvedor verificada nem AAB gerado neste ambiente.

---

## 1. O que já está no repositório

| Item | Situação | Onde |
|---|---|---|
| Exclusão de conta in-app, com senha | **Feito** — `DELETE /api/v1/users/me`, hard delete em cascata, tela em Perfil | `UserController`, `UserService`, `mobile/app/(tabs)/perfil.tsx` |
| Testes da exclusão (API real + mock) | **Feito** — 7 testes de integração e 5 testes mobile | `AccountDeletionIntegrationTest`, `accountDeletion.test.ts` |
| Rascunho da política de privacidade | **Feito, não publicado** | [`PRIVACY.md`](PRIVACY.md) |
| Rascunho dos termos de uso | **Feito, não publicado** | [`TERMS.md`](TERMS.md) |
| Links legais no app | **Feito, desligados por padrão** — só aparecem com `EXPO_PUBLIC_PRIVACY_URL` e `EXPO_PUBLIC_TERMS_URL` | `mobile/app/(tabs)/perfil.tsx` |
| `targetSdk` / `applicationId` / `versionCode` | Definidos no `app.json`: `com.ironmind.app`, `versionCode 1` | `mobile/app.json` |
| Manifesto de permissões | Apenas notificações e vibração | `mobile/app.json` |

## 2. Decisão 13 — EAS Build ou Gradle local

Ainda **não decidida**. O projeto não tem `eas.json` nem a pasta `android/`
gerada; o caminho de build precisa ser escolhido antes do primeiro AAB.

| Critério | EAS Build (nuvem) | Gradle local |
|---|---|---|
| Conta necessária | Expo (plano gratuito tem fila e limite de builds) | Nenhuma conta extra |
| Credenciais | EAS pode gerar e guardar a keystore | Você gera e guarda a keystore |
| Máquina | Nada além do Node | JDK 17 + Android SDK |
| Reproducibilidade | Alta (imagem gerenciada) | Depende do SDK instalado |
| Segredos no repo | Nenhum | Nenhum, se a keystore e o `gradle.properties` forem ignorados |
| Indicado quando | Time pequeno, sem CI Android | CI próprio ou necessidade de controle total |

**Recomendação provisória:** EAS Build para o primeiro envio, porque o projeto é
Expo e não tem código nativo próprio. Se a decisão for Gradle local, os passos
da seção 4 continuam válidos.

Para registrar a decisão, troque a linha 13 da tabela da
[`SPEC.md` §20](SPEC.md#20-decisões-pendentes) por **Decidido** com o caminho
escolhido.

## 3. Ações humanas obrigatórias (não automatizáveis aqui)

- [ ] Criar/verificar a **conta de desenvolvedor** do Google Play (`[PREENCHER: titular]`).
- [ ] Criar o app no Play Console com o pacote `com.ironmind.app`.
- [ ] Publicar a política de privacidade em URL pública, HTTPS e estável.
      `[PREENCHER: URL]`
- [ ] Publicar os termos de uso em URL pública. `[PREENCHER: URL]`
- [ ] Preencher `EXPO_PUBLIC_PRIVACY_URL` e `EXPO_PUBLIC_TERMS_URL` no build.
- [ ] Fazer a revisão jurídica de `PRIVACY.md` e `TERMS.md` (LGPD, CDC, idade
      mínima, transferência internacional).
- [ ] Definir o **canal web de solicitação de exclusão** exigido pelo
      formulário *Data Safety* (ver seção 6).
- [ ] Gerar a keystore **fora do repositório**, guardar backup seguro e
      cadastrar a chave de upload no Play Console.
- [ ] Preencher o formulário *Data Safety* e a classificação de conteúdo.
- [ ] Definir a hospedagem do backend e o domínio de produção (decisão 6).
- [ ] Resolver a decisão 3 (provedor de LLM, orçamento e retenção) **antes** de
      habilitar IA em produção; publicar com `LLM_PROVIDER=mock` caso contrário.

## 4. Keystore e AAB

### 4.1 Gerar a keystore (uma vez, fora do repositório)

No PowerShell, em uma pasta segura fora do projeto:

```powershell
keytool -genkeypair -v `
  -keystore ironmind-upload.jks `
  -alias ironmind-upload `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storetype JKS
```

Regras:

- **Nunca** commitar `.jks`, `.keystore`, `keystore.properties` ou senhas.
- Guarde a senha em gerenciador de segredos e faça backup offline (perder a
  chave de upload impede novas atualizações se o Play App Signing não estiver
  ativo).
- Ative o **Play App Signing** ao criar o app no Console.

### 4.2 Gerar o AAB

Com EAS (se essa for a decisão):

```bash
cd mobile
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile production
```

Com Gradle local (requer `npx expo prebuild --platform android`):

```bash
cd mobile
npx expo prebuild --platform android
cd android
./gradlew bundleRelease
```

Saída esperada: `mobile/android/app/build/outputs/bundle/release/app-release.aab`.

> `npx expo prebuild` cria a pasta `android/`; ela não existe hoje. Decida se
> ela será versionada (build local reproduzível) ou gerada no CI. Se for
> versionada, a keystore continua fora do repositório e referenciada por
> variável de ambiente.

### 4.3 Antes de cada envio

- [ ] Incrementar `android.versionCode` no `mobile/app.json`.
- [ ] Conferir `android.version` (nome visível).
- [ ] Confirmar `targetSdkVersion` gerado ≥ 35 (exigência atual do Play; o Expo
      SDK 58 gera valor compatível, mas confira no `android/app/build.gradle`).
- [ ] Confirmar que o build aponta para a API de **produção**, não para
      `localhost`, e que `EXPO_PUBLIC_USE_MOCK_API=false`.
- [ ] Confirmar que nenhuma chave de LLM, senha de banco ou keystore entrou no
      bundle ou no repositório.
- [ ] Rodar `npx tsc --noEmit` e `npx jest`.
- [ ] Subir no **track de teste interno** e validar em aparelho físico.

## 5. Matriz mínima antes do track de produção

A matriz completa está na
[`SPEC.md` §16.5](SPEC.md#165-matriz-de-validação-android). Para o primeiro
envio, no mínimo:

- [ ] API 26 (Android 8.0) ou o mínimo declarado pelo Expo, e a versão estável mais recente.
- [ ] Um Pixel **e** um aparelho de outra marca (Samsung, Motorola ou Xiaomi).
- [ ] Tela compacta (~5") e tela grande (6,7"+).
- [ ] Back por gesto e botão físico.
- [ ] Sessão de treino em andamento sobrevivendo a background, multitarefa e reabertura do app.
- [ ] Rede lenta, offline e reconexão (fila offline).
- [ ] Fonte do sistema no máximo e TalkBack na tela de registro de série e de exclusão de conta.

## 6. *Data Safety* — mapeamento a partir do código

O formulário precisa ser **idêntico** ao que o app faz. Mapeamento atual:

| Categoria do Play | O app coleta? | Observação |
|---|---|---|
| Nome | Sim | Cadastro e perfil |
| E-mail | Sim | Login e recuperação de acesso |
| Saúde e fitness | Sim | Treinos, cargas, recordes e restrições por lesão |
| Informações pessoais — outros | Não | — |
| Localização | Não | — |
| Contatos, SMS, chamadas | Não | — |
| Fotos, vídeos, áudio | Não no MVP | A voz é transcrita no backend e não armazenada; confirmar quando a gravação for habilitada no app |
| Atividade no app | Sim (técnico) | Histórico de sessões e logs de requisição |
| Identificadores do dispositivo | Não | Não há SDK de publicidade |
| Diagnóstico/crash | Não hoje | Confirmar se será adicionado |

Finalidades: funcionalidade do app, segurança e prevenção de fraude. Não há
venda de dados nem publicidade.

Pontos de atenção:

- **Exclusão de conta:** o Play exige que o app ofereça exclusão **e** que o
  formulário informe uma **URL web** para solicitar a exclusão sem instalar o
  app. Hoje existe apenas a exclusão in-app (`Perfil → Excluir conta`). Criar a
  página/URL é pendência humana.
- **Dados sensíveis:** restrições por lesão precisam estar declaradas.
- **Provedor de LLM:** se estiver ativo, o formulário deve declarar o
  compartilhamento com prestador de serviço e a transferência internacional,
  se houver.
- **Criptografia em trânsito:** declarar HTTPS obrigatório em produção e
  confirmar que a hospedagem usa TLS.
- O texto da política de privacidade e o formulário devem citar as mesmas
  categorias e finalidades.

## 7. Ordem sugerida

1. Resolver a decisão 13 e gerar a keystore fora do repositório.
2. Revisar e publicar `PRIVACY.md` e `TERMS.md`; configurar as URLs no build.
3. Criar a URL web de solicitação de exclusão.
4. Preencher *Data Safety* e classificação de conteúdo.
5. Gerar o AAB e enviar ao track de teste interno.
6. Rodar a matriz Android mínima e só então promover para produção.
