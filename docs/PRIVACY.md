# Política de Privacidade — IronMind AI (rascunho)

> **Rascunho técnico, não publicado.** Este texto descreve o tratamento de dados
> que o código realmente faz hoje. Ele **não** substitui revisão jurídica e não
> deve ser publicado no Google Play antes de:
>
> 1. preencher todos os campos `[PREENCHER: …]`;
> 2. confirmar a base legal de cada finalidade com apoio jurídico (LGPD);
> 3. publicar o texto em uma URL pública e estável;
> 4. configurar `EXPO_PUBLIC_PRIVACY_URL` no build do app.
>
> Enquanto isso, o app não exibe link de política de privacidade.

**Última atualização:** rascunho de 22 de outubro de 2026.

---

## 1. Quem é o controlador

O IronMind AI é operado por `[PREENCHER: razão social]`, inscrita no CNPJ
`[PREENCHER: CNPJ]`, com sede em `[PREENCHER: endereço]` ("nós"). Para fins da
Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD), somos o
**controlador** dos dados pessoais descritos abaixo.

- **Encarregado (DPO):** `[PREENCHER: nome]`
- **Contato de privacidade:** `[PREENCHER: e-mail]`

## 2. Quais dados tratamos

### 2.1 Dados de conta

A conta (nome, e-mail e credencial) é mantida pelo **provedor de identidade**
`[PREENCHER: provedor de identidade]`, que autentica você e entrega ao IronMind
apenas um identificador opaco no formato UUID. O backend do IronMind **não
guarda** nome, e-mail, senha, papel nem fuso horário.

| Dado | Finalidade | Origem |
|---|---|---|
| Identificador (UUID) | Vincular treinos, recordes e restrições a você | Provedor de identidade, por header injetado pelo gateway |
| Nome e e-mail | Cadastro e login | Provedor de identidade — fora do IronMind |
| Senha | Autenticação | Provedor de identidade — o IronMind nunca a recebe |

### 2.2 Dados de treino

Programas, dias, exercícios, metas de séries e repetições, sessões (início,
pausa, retomada, conclusão ou abandono), séries registradas (carga,
repetições, duração, distância, esforço percebido e descanso), recordes
pessoais calculados, volume de treino e histórico.

### 2.3 Dados sensíveis de saúde

Restrições por lesão: região do corpo, descrição em texto livre e exercícios
que você pediu para evitar. Esses dados podem revelar informação de saúde e
recebem tratamento de **dado pessoal sensível** (art. 5º, II, e art. 11 da
LGPD). Eles são visíveis apenas para você e não são enviados para o provedor de
IA.

### 2.4 Dados de uso da IA

- **Propostas de treino e sugestões de carga:** guardamos o resultado, o status
  da revisão (`PENDING`, `ACCEPTED`, `EDITED`, `REJECTED` ou `ERROR`), o resumo
  não sensível da entrada e a versão do modelo.
- **Conversas de coaching e transcrições de voz:** **não são armazenadas** no
  banco. A resposta é devolvida na hora e descartada pelo backend.
- **Conteúdo enviado ao provedor de LLM:** objetivo, experiência e dias de
  treino padrão, catálogo de exercícios visível para você, restrições por
  **região do corpo** e o texto que você escreve no prompt. **Não enviamos**
  seu identificador, nome, e-mail, credencial nem a descrição em texto livre das
  suas restrições.

### 2.5 Dados técnicos

Endereço IP e identificador da requisição (trace ID) usados para limitação de
requisições, segurança e diagnóstico. `[PREENCHER: prazo de retenção dos logs]`.

Não usamos SDK de publicidade, rastreadores de terceiros nem cookies no app.

## 3. Bases legais e finalidades

| Finalidade | Base legal (LGPD) |
|---|---|
| Criar e manter sua conta no provedor de identidade, autenticar e recuperar acesso | Execução de contrato (art. 7º, V) |
| Registrar treinos, calcular volume, 1RM e recordes | Execução de contrato (art. 7º, V) |
| Tratar restrições por lesão | Consentimento específico para dado sensível (art. 11, I) `[PREENCHER: confirmar com jurídico]` |
| Gerar propostas e sugestões com IA sob seu comando | Execução de contrato ou consentimento `[PREENCHER: confirmar]` |
| Prevenir abuso, fraude e ataques | Legítimo interesse (art. 7º, IX) |
| Cumprir obrigações legais e responder a autoridades | Obrigação legal (art. 7º, II) |

Você pode recusar ou retirar o consentimento para os tratamentos baseados nele;
isso pode impedir o uso dos recursos correspondentes.

## 4. Com quem compartilhamos

- **Provedor de infraestrutura e banco de dados:** `[PREENCHER: provedor e região]`.
- **Provedor de identidade:** `[PREENCHER: provedor]`, responsável pela conta,
  autenticação e recuperação de acesso.
- **Provedor de LLM:** `[PREENCHER: provedor, modelo e região]`, quando a
  configuração `LLM_PROVIDER` estiver diferente de `mock`. Recebe apenas o
  conteúdo descrito no item 2.4.
- **Autoridades públicas**, quando houver obrigação legal.

Não vendemos dados pessoais e não os usamos para publicidade de terceiros.
`[PREENCHER: existe transferência internacional? Se sim, indicar país e
salvaguardas.]`

## 5. Por quanto tempo guardamos

| Dado | Retenção |
|---|---|
| Conta, nome e e-mail | No provedor de identidade, até a exclusão da conta |
| Identificador e dados de treino | Até a exclusão da conta |
| Programas, sessões, séries e recordes | Até a exclusão da conta |
| Restrições por lesão | Até a exclusão da conta ou até você removê-las |
| Recomendações de IA | Até a exclusão da conta |
| Conversas de coaching e transcrições de voz | Não armazenadas |
| Logs técnicos | `[PREENCHER: prazo]` |

A exclusão da conta é **definitiva**. O provedor de identidade encerra a conta e
o IronMind remove todos os documentos vinculados ao seu identificador. Não
mantemos cópia de arquivo.

## 6. Seus direitos

Você pode, a qualquer momento:

- **Acessar** seus dados nas telas de histórico, evolução e recordes;
- **Corrigir** restrições e séries (e, no provedor de identidade, nome e
  preferências da conta);
- **Excluir a conta e todos os dados** pelo provedor de identidade
  `[PREENCHER: caminho no app ou URL web]`, que também aciona a remoção dos
  dados de treino; pedidos pelo contato de privacidade também são atendidos;
- **Revogar o consentimento** para o tratamento de dados sensíveis;
- **Solicitar portabilidade** dos dados que você forneceu
  `[PREENCHER: formato e canal de entrega — ainda não implementado]`;
- **Reclamar** à Autoridade Nacional de Proteção de Dados (ANPD).

Responderemos no prazo legal. Para proteger sua conta, podemos pedir confirmação
de identidade antes de atender pedidos feitos fora do app.

## 7. Segurança

- A autenticação e o armazenamento da credencial são responsabilidade do
  provedor de identidade; o IronMind não recebe senha nem token.
- Toda operação é limitada ao titular: o identificador do usuário vem do header
  injetado pelo gateway, nunca do corpo da requisição; recurso de outro usuário
  responde `404`.
- Chaves de API e credenciais ficam no servidor, nunca no aplicativo.
- Limitação de requisições nas rotas de IA e, na borda, no acesso ao serviço.
- `[PREENCHER: TLS obrigatório em produção, backup criptografado, política de
  resposta a incidentes.]`

Nenhum sistema é totalmente imune. Em caso de incidente relevante, comunicaremos
os titulares e a ANPD conforme a LGPD.

## 8. Crianças e adolescentes

O app é destinado a maiores de 18 anos `[PREENCHER: confirmar]`. Não coletamos
intencionalmente dados de crianças. Se identificarmos uma conta nessa condição,
ela será encerrada.

## 9. Alterações desta política

Mudanças materiais serão comunicadas no app ou por e-mail antes de entrar em
vigor, com a data da última atualização no topo. `[PREENCHER: canal e prazo de
aviso.]`

## 10. Observações para a revisão jurídica

- Confirmar a base legal das restrições por lesão e do envio de dados ao
  provedor de LLM.
- Definir se haverá transferência internacional e qual salvaguarda será usada.
- Definir prazo de retenção de logs e o procedimento de anonimização.
- Descrever o canal de portabilidade e o formato de exportação (ainda não
  implementado).
- Revisar o texto junto com o formulário **Data Safety** do Google Play para
  que as duas declarações sejam idênticas.
