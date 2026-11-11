# Configurar a pipeline: passo a passo

Este roteiro liga a pipeline de CI/CD da Roda. Leva uns 30 minutos e é feito uma vez. O que cada workflow faz está em [`.github/workflows/README.md`](../.github/workflows/README.md).

## O que muda

| | Hoje | Depois |
|---|---|---|
| Testes | Nenhum automático | `ci.yml` em toda pull request e todo push na `main` |
| Backend de produção | A Railway publica sozinha a cada push na `main` | Só o `deploy.yml` publica, depois da sua aprovação |
| Frontend de produção | A Vercel publica sozinha a cada push na `main` | Só o `deploy.yml` publica, depois da sua aprovação |
| Ambiente de dev | Ligado à branch `dev`, parado desde maio | Recebe todo commit da `main` que passou na CI, sem aprovação |

```
push na main → ci (web + e2e) → deploy: development → você aprova → production
```

A branch `dev` deixa de ser necessária: o ambiente de dev passa a receber a `main`.

## Onde cada valor fica

Dois valores são segredos e seis são variáveis comuns. Todos ficam no GitHub, em **Environments**. Nada vai para o código.

| Nome | Tipo | Onde | `development` | `production` |
|---|---|---|---|---|
| `RAILWAY_TOKEN` | Segredo | Environment | Token do ambiente `dev` da Railway | Token do ambiente `production` da Railway |
| `VERCEL_TOKEN` | Segredo | Environment | Token da Vercel | O mesmo token |
| `VERCEL_ORG_ID` | Variável | Environment | Team ID da Vercel | O mesmo |
| `VERCEL_PROJECT_ID` | Variável | Environment | Project ID da Vercel | O mesmo |
| `API_URL` | Variável | Environment | `https://spyfall-webgame-dev.up.railway.app` | `https://spyfall-webgame-production.up.railway.app` |
| `WEB_HOST` | Variável | Environment | `jogos.mefelipe.com.br` | `spyfall.mefelipe.com.br` |
| `DEPLOY_ENABLED` | Variável | Repositório | `true` (uma só, vale para os dois) | |

Regras de formato, que o `deploy.yml` confere antes de publicar:

- `API_URL` começa com `https://` e **não** termina com barra.
- `WEB_HOST` é só o host: sem `https://` e sem barra.

Além do GitHub, o backend de cada ambiente lê as próprias variáveis na Railway (`ALLOWED_ORIGINS` e as demais). Elas são conferidas na Parte 1.

---

## Parte 1 — Railway

Projeto `spyfall`, serviço `spyfall-webgame`. O seletor de ambiente fica no topo do painel do projeto.

### 1.1 Consertar o ambiente `dev`

O ambiente `dev` ainda está com a configuração antiga (Root Directory `/backend`, sem Dockerfile e sem health check), a mesma que derrubou a produção. Sem este passo, o primeiro deploy de development falha.

- [ ] Selecione o ambiente **dev** e abra o serviço **spyfall-webgame**.
- [ ] Aba **Settings**, seção **Source**:
  - **Branch**: troque `dev` por `main`.
  - **Root Directory**: troque `/backend` por `/`.
- [ ] Aba **Settings**, seção **Deploy**: em **Healthcheck Path**, escreva `/health`.
- [ ] Aba **Variables**:
  - Crie `RAILWAY_DOCKERFILE_PATH` com o valor `backend/Dockerfile`.
  - Edite `ALLOWED_ORIGINS` para `https://jogos.mefelipe.com.br` (sem barra no fim).
  - Apague `RAILWAY_ROOT_DIRECTORY`, que sobrou da configuração antiga.
  - `PORT` continua `3000`: é a porta para onde o domínio do serviço aponta.
- [ ] A Railway junta as mudanças e mostra um botão **Deploy** no topo. Clique nele e espere o deploy ficar verde.
- [ ] Confira no navegador: `https://spyfall-webgame-dev.up.railway.app/health` deve responder `{"status":"ok", ...}`.

### 1.2 Conferir o ambiente `production`

Ele já foi consertado em 10/11. Só confirme:

- [ ] Ambiente **production**, serviço **spyfall-webgame**, aba **Variables**: `ALLOWED_ORIGINS` contém `https://spyfall.mefelipe.com.br`. A fumaça de produção confere exatamente essa origem.

### 1.3 Criar os dois tokens

Um token de projeto da Railway vale para um ambiente só. Por isso são dois.

- [ ] No projeto `spyfall`, abra **Settings** (do projeto, não do serviço) e a página **Tokens**.
- [ ] Crie um token: nome `github-actions-dev`, ambiente **dev**. **Copie o valor agora**: a Railway não mostra de novo. Guarde num lugar temporário, como o gerenciador de senhas.
- [ ] Crie outro: nome `github-actions-production`, ambiente **production**. Copie também.

### 1.4 Desligar o deploy automático da Railway

Enquanto a Railway publicar sozinha a cada push, a produção muda sem a sua aprovação. Faça nos dois ambientes, **dev** e **production**:

- [ ] Serviço **spyfall-webgame**, aba **Settings**, seção **Source**, onde aparecem o repositório e a branch: clique em **Disable** no deploy automático.
- [ ] Se o painel não mostrar esse botão, clique em **Disconnect** para desligar o repositório do serviço. O `railway up` da pipeline envia o código direto e não precisa da ligação com o GitHub.

> Faça o 1.4 **depois** do 1.1. O deploy do passo 1.1 usa a ligação com o GitHub para construir a `main` uma primeira vez.

---

## Parte 2 — Vercel

Projeto `spyfall-webgame`, no time `tiodevs' projects`.

### 2.1 Criar o token

- [ ] Abra <https://vercel.com/account/settings/tokens>.
- [ ] **Create Token**: nome `github-actions-spyfall`, escopo no time do projeto, validade à sua escolha (com validade, anote a data: quando vencer, o deploy falha até trocar o token).
- [ ] **Copie o valor agora**: a Vercel não mostra de novo.

### 2.2 Anotar os dois IDs

Não são segredos, mas a CLI precisa deles para saber em que projeto publicar.

- [ ] **Project ID**: projeto `spyfall-webgame` → **Settings** → **General** → **Project ID** (começa com `prj_`).
- [ ] **Team ID**: no seletor de time, o time do projeto → **Settings** → **General** → **Team ID** (começa com `team_`).

### 2.3 O que não mexer

- O domínio `jogos.mefelipe.com.br` continua ligado à branch `dev` em **Settings → Domains**. É essa ligação que o mantém fora da produção. A pipeline aponta o domínio para cada implantação de development pela API da Vercel.
- A proteção de deployments (**Deployment Protection**) não vale para o domínio de produção, mas **vale** para `jogos.mefelipe.com.br`, porque ele aponta para implantações de preview: quem não está logado na Vercel cai na tela de login. Para a fumaça de development conseguir abrir a página, crie o segredo de bypass:
  1. Projeto `spyfall-webgame` → **Settings** → **Deployment Protection** → **Protection Bypass for Automation** → **Add Secret** (ou **Create**). Copie o valor.
  2. No GitHub, grave nos dois Environments: `gh secret set VERCEL_AUTOMATION_BYPASS_SECRET --env development` e o mesmo com `--env production`.

  A alternativa é desligar a **Vercel Authentication** na mesma tela, deixando o dev público.
- A variável `VITE_SOCKET_URL` da Vercel deixa de ser a fonte do endereço do backend: a pipeline passa o `API_URL` do GitHub no build, e ele vence o valor da Vercel. Pode deixar como está.

O deploy automático da Vercel é desligado pelo arquivo [`frontend/vercel.json`](../frontend/vercel.json), que já está no repositório. Vale a partir do push que o levar para a `main`.

---

## Parte 3 — GitHub

Repositório `Tiodevs/spyfall-webgame` → **Settings**.

### 3.1 Environment `development`

- [ ] **Settings** → **Environments** → **New environment** → nome `development` → **Configure environment**.
- [ ] Em **Deployment branches and tags**, escolha **Selected branches and tags** → **Add deployment branch or tag rule** → tipo **Branch**, nome `main` → **Add rule**.
- [ ] Em **Environment secrets**, **Add environment secret**, duas vezes:
  - `RAILWAY_TOKEN` = o token `github-actions-dev` (passo 1.3)
  - `VERCEL_TOKEN` = o token da Vercel (passo 2.1)
- [ ] Em **Environment variables**, **Add environment variable**, quatro vezes:
  - `VERCEL_ORG_ID` = o Team ID (passo 2.2)
  - `VERCEL_PROJECT_ID` = o Project ID (passo 2.2)
  - `API_URL` = `https://spyfall-webgame-dev.up.railway.app`
  - `WEB_HOST` = `jogos.mefelipe.com.br`
- [ ] Não marque **Required reviewers** aqui: development publica sem aprovação.

### 3.2 Environment `production`

Na lista de Environments já existe um chamado **Production**, criado pela integração da Vercel. O GitHub não diferencia maiúsculas no nome, então é esse mesmo que o `deploy.yml` usa. Não crie outro.

- [ ] **Settings** → **Environments** → clique em **Production**.
- [ ] Marque **Required reviewers**, procure o seu usuário (`Tiodevs`) e adicione.
- [ ] Deixe **Prevent self-review** **desmarcado**. Marcado, quem fez o push não pode aprovar o próprio deploy, e você é o único revisor.
- [ ] **Save protection rules**.
- [ ] Em **Deployment branches and tags**: **Selected branches and tags** → regra de **Branch** `main`.
- [ ] Em **Environment secrets**:
  - `RAILWAY_TOKEN` = o token `github-actions-production` (passo 1.3)
  - `VERCEL_TOKEN` = o mesmo token da Vercel
- [ ] Em **Environment variables**:
  - `VERCEL_ORG_ID` = o mesmo Team ID
  - `VERCEL_PROJECT_ID` = o mesmo Project ID
  - `API_URL` = `https://spyfall-webgame-production.up.railway.app`
  - `WEB_HOST` = `spyfall.mefelipe.com.br`

Os outros Environments da lista (`Preview`, `spyfall / production`, `artistic-empathy / ...`) foram criados pelas integrações antigas. A pipeline não os usa.

### 3.3 Atalho pelo terminal (opcional)

As variáveis e os segredos também podem entrar pelo `gh`, da pasta do projeto. Os comandos de segredo pedem o valor na hora, sem deixá-lo no histórico do terminal.

O Environment precisa existir antes. Sem ele, todo comando com `--env` responde `HTTP 404: Not Found`. O `production` já existe; o `development` é criado no passo 3.1 ou com:

```bash
gh api -X PUT repos/Tiodevs/spyfall-webgame/environments/development
```

Esse comando cria o Environment vazio. A regra da branch `main` do passo 3.1 continua sendo feita na tela.

```bash
# development
gh variable set API_URL --env development --body "https://spyfall-webgame-dev.up.railway.app"
gh variable set WEB_HOST --env development --body "jogos.mefelipe.com.br"
gh variable set VERCEL_ORG_ID --env development --body "team_..."
gh variable set VERCEL_PROJECT_ID --env development --body "prj_..."
gh secret set RAILWAY_TOKEN --env development
gh secret set VERCEL_TOKEN --env development

# production
gh variable set API_URL --env production --body "https://spyfall-webgame-production.up.railway.app"
gh variable set WEB_HOST --env production --body "spyfall.mefelipe.com.br"
gh variable set VERCEL_ORG_ID --env production --body "team_..."
gh variable set VERCEL_PROJECT_ID --env production --body "prj_..."
gh secret set RAILWAY_TOKEN --env production
gh secret set VERCEL_TOKEN --env production
```

Para conferir o que ficou gravado (os segredos aparecem só pelo nome):

```bash
gh variable list --env development
gh secret list --env development
gh variable list --env production
gh secret list --env production
```

---

## Parte 4 — Ligar e publicar pela primeira vez

- [ ] Envie os arquivos da pipeline para a `main` (commit e push). A CI roda nesse push. O deploy **não** roda ainda, porque `DEPLOY_ENABLED` não existe.
- [ ] Espere a CI ficar verde em **Actions** → **ci**.
- [ ] Ligue o pipeline: **Settings** → **Secrets and variables** → **Actions** → aba **Variables** → **New repository variable** → nome `DEPLOY_ENABLED`, valor `true`. Pelo terminal: `gh variable set DEPLOY_ENABLED --body "true"`.
- [ ] Dispare o primeiro deploy: **Actions** → **deploy** → **Run workflow** → branch `main` → **Run workflow**. Dos próximos pushes em diante ele dispara sozinho, depois da CI.

### Como aprovar a produção

1. O job `development` publica e testa o ambiente de dev. Abra `https://jogos.mefelipe.com.br` e confira o que quiser.
2. O job `production` fica em **Waiting**. O GitHub manda um e-mail e mostra um aviso amarelo na página da execução.
3. Clique em **Review deployments**, marque **production** e clique em **Approve and deploy**. Para descartar, **Reject**.
4. O job publica a produção, roda a fumaça e joga uma partida de cada jogo em `spyfall.mefelipe.com.br`.

Três coisas para saber:

- **Aprove num horário sem gente jogando quando o backend mudou.** O deploy na Railway reinicia o servidor e as partidas em andamento caem. Quando só o frontend mudou, o backend não é republicado e ninguém cai. A execução avisa qual é o caso.
- A aprovação não vence rápido: a execução espera até 30 dias. Se a `main` andar nesse meio tempo, aprovar a execução antiga não publica nada; aprove a mais nova. Se a mais nova aparecer como pendente atrás de uma antiga, rejeite a antiga.
- O disparo manual só publica um commit em que a CI já passou.

---

## Se algo falhar

| Onde falha | Causa provável | O que fazer |
|---|---|---|
| `deploy` nem aparece depois da CI | `DEPLOY_ENABLED` não é `true`, ou a CI não veio de um push na `main` | Conferir a variável do repositório |
| Passo **Conferir as variáveis do ambiente** | Variável ausente, `API_URL` com barra no fim ou `WEB_HOST` com `https://` | Corrigir no Environment indicado na mensagem |
| **Deploy do backend** com `Unauthorized` | `RAILWAY_TOKEN` errado, ou token de um ambiente no Environment do outro | Regravar o segredo com o token do ambiente certo (1.3) |
| **Deploy do backend** falha no build | Root Directory ou `RAILWAY_DOCKERFILE_PATH` do ambiente na Railway | Refazer o 1.1 |
| **Build e deploy na Vercel** falha no `vercel pull` | `VERCEL_TOKEN`, `VERCEL_ORG_ID` ou `VERCEL_PROJECT_ID` | Conferir os três (2.1 e 2.2) |
| **Build e deploy de preview** falha no alias | O token não alcança o time, ou o domínio saiu do projeto | Conferir o escopo do token e **Settings → Domains** |
| Fumaça: "o backend no ar é o do commit..." depois de 10 minutos | A versão nova não passou no health check, e a Railway manteve a anterior | Ver o log do deploy no painel da Railway |
| Fumaça: "o backend aceita a origem..." | `ALLOWED_ORIGINS` da Railway não tem `https://<WEB_HOST>` | Corrigir a variável na Railway (1.1 ou 1.2) |
| Fumaça: "o JavaScript do frontend aponta para..." | `API_URL` do Environment diferente do backend real | Corrigir `API_URL` no Environment |
| Fumaça: a página responde 401 | `WEB_HOST` é um endereço `*.vercel.app`, coberto pela proteção de deployments | Usar o domínio próprio em `WEB_HOST` |

## Voltar uma versão

O rollback é manual:

- **Backend:** painel da Railway → serviço → **Deployments** → nos três pontinhos do deploy anterior, **Rollback**.
- **Frontend:** painel da Vercel → **Deployments** → na implantação de produção anterior, **Instant Rollback**.

Depois, confira com a fumaça, da raiz do repositório:

```bash
node .github/scripts/smoke.mjs https://spyfall.mefelipe.com.br https://spyfall-webgame-production.up.railway.app
```
