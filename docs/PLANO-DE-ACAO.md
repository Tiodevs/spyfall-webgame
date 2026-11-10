# Roda — diagnóstico e plano de ação

Análise de 10/11/2026 sobre o commit `c065555` (hub Roda com Spyfall e Quem sou eu).

## Resumo

| # | Achado | Severidade | Status |
|---|--------|-----------|--------|
| 1 | Produção fora do ar desde 10/09: o Railway builda só a pasta `backend/`, mas o backend importa `../shared` → `ERR_MODULE_NOT_FOUND` → container cai → 502 → o Socket.io não conecta | Crítico | Corrigido no código. Falta ajustar o serviço no Railway (Fase 0) |
| 2 | Um evento malformado (`socket.emit('join-room')` sem payload) derruba o servidor e apaga todas as salas | Crítico | Reproduzido no Docker local. Fase 1 |
| 3 | Qualquer jogador pode assumir a vaga de outro (o `playerId` é público): o espião vê o local, e no Quem sou eu dá para ver a própria identidade | Alto | Fase 1 |
| 4 | Dependências vulneráveis: backend com 8 (1 crítica, 5 altas: `socket.io-parser`, `ws`, `proxy-addr`...), frontend com 19 | Alto | Fase 1 (`npm audit fix`) |
| 5 | `VITE_SOCKET_URL` com barra final → o front pede `//api/rooms` → 404 no Express 5 (a lista de salas não carrega) | Médio | Corrigido no código |
| 6 | Sem healthcheck no Railway: o deploy quebrado de 10/09 substituiu o que funcionava sem ninguém perceber | Médio | `/health` criado. Falta configurar no Railway |

## 1. O que foi feito nesta sessão

- `backend/Dockerfile` (contexto = raiz do repo, inclui `shared/`), com estágios `dev` (nodemon) e `prod` (padrão, usado pelo Railway).
- `frontend/Dockerfile` + `frontend/nginx.conf`: build do Vite servido por nginx, com proxy de `/socket.io` e `/api` (mesma origem, funciona no celular pelo IP da rede).
- `docker-compose.yml` (ambiente igual a produção, `:8080`), `docker-compose.dev.yml` (hot reload, `:5173`), serviço `smoke` (teste automático), `.dockerignore` e scripts `npm run docker:*`.
- Backend: rota `/health`, `ALLOWED_ORIGINS` tolerante a espaço e barra final, encerramento limpo no `SIGTERM`.
- Frontend: `src/lib/serverUrl.js` centraliza a URL do backend (remove barra final, aceita mesma origem). `useSocket` e `RoomsList` usam ela.
- `roda-game-test.mjs` aceita a URL do backend por argumento.

**Validado no Docker local:** teste automático 25/25. Pela interface: hub → criar sala → 3 jogadores → partida → acusação correta → placar, reconexão ao recarregar a página, Quem sou eu com turnos. Hot reload do backend (nodemon) e do front (Vite HMR) no Windows.

## 2. Produção: por que o Socket.io não conecta

Evidências:

- Railway: o último deploy (`c065555`, 27/10) está `CRASHED`. O build passa, mas o container morre ao iniciar. `GET /socket.io/?EIO=4&transport=polling` → `502 Application failed to respond`.
- Configuração do serviço: `rootDirectory: /backend`, builder Railpack. O Railpack copia só `backend/` para `/app`.
- `backend/src/index.js` importa `../../shared/catalog.js`. Reproduzido localmente com só a pasta `backend/`: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../shared/catalog.js'`.
- Isso entrou no commit `1c67a74` (hub Roda, 10/09), que criou `shared/`. Antes dele o backend não importava nada de fora da própria pasta.
- Vercel está ok (`READY`, 200). O bundle aponta para `https://spyfall-webgame-production.up.railway.app/` (com barra final, origem do achado 5).

## 3. Análise

### 3.1 Funcionalidades

**O que já existe e funciona:** hub com 2 jogos; salas com código de 4 letras e lista pública; reconexão com 90 s de tolerância; migração de host; placar acumulado por sala; timer sincronizado pelo servidor. Spyfall: 2 decks, 1–2 espiões, cargos, acusação com votação, chute do espião, votação final. Quem sou eu: 3 decks, turnos, chute, ranking por ordem de acerto.

**Bugs e lacunas encontrados:**

| Onde | Problema |
|------|----------|
| `backend/src/games/spyfall.js:120` e `:76` | Fim por acusação não mostra quem era o espião nem o local: o espião é removido de `spyIds` antes do `endGame`, que monta o resumo a partir dessa lista vazia (visto na UI: "Acusação correta! Felipe pegou Bot Ana. Partida encerrada.") |
| `backend/src/games/spyfall.js:323-330` | `spy-guess` limpa o timer **antes** de validar o local. Um chute com id inválido mata o timer e a partida nunca termina por tempo |
| `backend/src/games/spyfall.js:365` | O servidor não impede o espião de acusar (só a UI esconde o botão). Se o espião acusa, o voto automático dele conta na resolução sem ele ser votante válido, e a acusação pode fechar antes de todos os agentes votarem |
| `backend/src/games/spyfall.js:442` | `vote-accusation` aceita qualquer valor em `vote`, não só `true`/`false` |
| `backend/src/games/spyfall.js:479` | Na votação final o espião vota e pontua se votar no outro espião (modo 2 espiões) |
| `frontend/src/components/GameRoom.jsx:714-738` | O espião não consegue riscar locais: no modo espião, tocar no local já é chutar |
| `backend/src/games/quemSouEu.js:207` | Qualquer jogador responde sim/não e o primeiro toque vale. Um jogador pode passar a vez dos outros respondendo "não" |
| `backend/src/index.js:543` | `end-game` sem partida em andamento emite `game-ended` vazio |
| Fases | Acusar e chutar continuam liberados durante a votação final |
| Teste local | Abas do mesmo navegador viram o mesmo jogador (o `playerId` fica no `localStorage`) |
| UX/a11y | `confirm()` nativo no chute (`GameRoom.jsx:719`); `user-scalable=no` bloqueia zoom (`index.html:8`); "Cidadão" na UI vs "Agente" no guia |
| Docs | O README cita `railway.json`/`nixpacks.toml`, que não existem (seção de deploy já corrigida) |

### 3.2 Segurança

| Severidade | Risco | Detalhe |
|-----------|-------|---------|
| Crítico | DoS com um evento | 13 handlers desestruturam o payload sem default (`index.js:386, 428, 474, 505, 543`, `spyfall.js:308, 365, 412, 458, 479`, `quemSouEu.js:207, 260, 293`). O Socket.io roda o handler dentro de `process.nextTick`, então a exceção não é capturada e derruba o processo. Também cai com `userName` que não é string |
| Alto | Personificação de jogador | `room-sync` envia o `playerId` (e o `socketId`, `index.js:71`) de todos. `rejoin-room` (`index.js:428`) só confere o `playerId`. Com o id de um agente, o espião emite `rejoin-room`, recebe o `room-sync` dele com o local e derruba a sessão original |
| Alto | Dependências | `npm audit`: backend 8 (crítica `proxy-addr`; altas `socket.io-parser` e `ws`, ambas de exaustão de memória), frontend 19 (`vite`, `ws`, `zod`...). Tudo resolvível com `npm audit fix` |
| Médio | Sem limites de uso | Criação de salas ilimitada, e sala criada sem ninguém entrar nunca é apagada. Sem rate limit por socket/IP, sem máximo de jogadores por sala. `generateRoomCode` é recursivo (`index.js:34`), `maxHttpBufferSize` no padrão de 1 MB |
| Médio | Mass assignment | `update-room-settings` grava chaves extras do cliente em `room.settings` (`index.js:501`) e retransmite para todos |
| Médio | Sem validação de entrada | Nenhum schema. Tipos não são checados em nenhum evento |
| Baixo | Amplificação | Toda mudança de sala faz `io.emit('rooms-updated')` com a lista inteira para todos os sockets conectados |
| Baixo | Logs | O log do início da partida grava espiões e local em claro (`spyfall.js:242`) |
| Ok | — | React escapa nomes (sem XSS), nenhum segredo no repositório, previews da Vercel protegidos por SSO |

### 3.3 Arquitetura

```
Vercel (React + Vite, SPA)  ──WebSocket / HTTP──▶  Railway (Express + Socket.io)
        │ alias @shared                                   │ import ../../shared
        └──────────────── shared/ (catálogo e regras) ────┘
                                     estado das salas: Map em memória, 1 instância
```

**Pontos fortes:** engine por jogo com ganchos claros (`startGame`, `serializeGame`, `endGame`, `before/afterRemovePlayer`, `registerHandlers`), serialização por jogador (segredos ficam no servidor), catálogo compartilhado, reconexão com tolerância.

**Problemas:**

1. **`shared/` não é um pacote.** Imports relativos (`../../../shared`) que dependem de onde a pasta está no disco. Foi isso que quebrou o deploy.
2. **Estado só em memória, uma instância.** Deploy, crash ou restart zera todas as partidas, e não dá para ter mais de uma réplica.
3. **Protocolo de eventos solto.** Cada engine registra eventos globais em todo socket (`spy-guess`, `quem-answer`...). Erros vão por um evento `error` genérico que `CreateRoom`, `RoomsList` e `GameRoom` escutam ao mesmo tempo. `getEngine` cai no Spyfall para tipo desconhecido.
4. **Front sem fronteira por jogo.** `GameRoom.jsx` tem 960 linhas misturando a sala genérica com as telas do Spyfall. O Quem sou eu já está separado, o Spyfall não.
5. **Sem rede de segurança.** Sem CI, sem testes de regra, lint com 14 problemas (12 erros), sem TypeScript (os contratos dos eventos não têm tipo), sem healthcheck no deploy, logs só com `console.log`.

## 4. Plano de ação

### Fase 0 — Colocar no ar (hoje)

- [ ] Commitar estas mudanças e mandar para a `main`.
- [ ] Railway, serviço `spyfall-webgame` (produção):
  - [ ] Settings → Source → **Root Directory** = `/`
  - [ ] Variável `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile`
  - [ ] Settings → Deploy → **Healthcheck Path** = `/health`
  - [ ] Watch Paths: `/backend/**` e `/shared/**`
  - [ ] Conferir `ALLOWED_ORIGINS` = `https://spyfall.mefelipe.com.br,https://spyfall-webgame.vercel.app`
  - [ ] A variável `RAILWAY_ROOT_DIRECTORY` não aparece na documentação do Railway como configuração (a raiz é definida em Settings → Source). Provável sobra, pode remover
- [ ] Validar: `https://spyfall-webgame-production.up.railway.app/health` → 200, badge "Online" em `spyfall.mefelipe.com.br`, lista de salas carregando.
- [ ] Aplicar o mesmo no ambiente `dev` do Railway se ele continuar em uso.

### Fase 1 — Segurança (1 a 2 dias)

1. **Blindar os handlers.** Um `safeOn(socket, evento, schema, handler)` com `try/catch`, payload padrão `{}` e validação com `zod`. Teste de regressão: o payload malformado de hoje não pode derrubar o processo.
2. **Separar identidade pública de credencial.** O servidor gera um `sessionToken` secreto no primeiro `join`, o cliente guarda, e o `rejoin` exige o token. O `playerId` continua público para a UI. Parar de enviar `socketId`.
3. **`npm audit fix`** no backend e no frontend, e rodar o teste automático em seguida.
4. **Limites.** Rate limit por socket (ex.: 20 eventos/s), máximo de salas por socket/IP, máximo de jogadores por sala (12 no Spyfall, 16 no Quem sou eu), apagar sala vazia ou sem `join` após 60 s, `maxHttpBufferSize: 10_000`, gerador de código iterativo.
5. **Settings por whitelist** em cada engine (só as chaves conhecidas).
6. **Regras no servidor, não na UI.** Decidir se o espião pode acusar (no jogo original pode) e aplicar no servidor. Só aceitar voto booleano. Limpar o timer só depois de validar o chute. Bloquear ações fora da fase (acusar e chutar durante a votação final).

### Fase 2 — Base para o hub crescer (cerca de 1 semana)

1. **npm workspaces** com `packages/shared` (`@roda/shared`). O Dockerfile já builda a partir da raiz.
2. **Protocolo único:** `game:action` com `{ type, payload }`, roteado para o engine da sala, schema por ação e *acknowledgement* (callback) nos fluxos de pedido/resposta (criar, entrar, chutar). `getEngine` estrito.
3. **Testes e CI:** testes unitários das regras (Vitest) para `spyfall.js` e `quemSouEu.js`; o `roda-game-test.mjs` vira teste de integração; GitHub Actions com lint, testes e build das imagens Docker em todo PR.
4. **Zerar o lint** (14 problemas hoje) e travar no CI.
5. **Front por módulo de jogo:** `games/<id>/{Play,Settings,Guide}` registrado num catálogo, `GameRoom` vira só a sala genérica, um store único de sala alimentado pelo `room-sync` e fim dos listeners duplicados.
6. **Observabilidade:** logs estruturados (`pino`) sem segredos do jogo, Sentry opcional.

### Fase 3 — Produto (contínuo)

- Corrigir os bugs da tabela 3.1 (resumo do fim por acusação, espião riscando locais, respostas no Quem sou eu só de quem foi perguntado...).
- Link de convite e QR code (`/r/ABCD`), sala privada fora da lista pública.
- Ferramentas de host: expulsar jogador, transferir host, zerar placar, "jogar de novo".
- Entrar como espectador numa partida em andamento.
- Sobreviver a deploy: snapshot das salas no Redis do Railway e aviso de "servidor reiniciando" para os clientes.
- Acessibilidade: liberar zoom, trocar `confirm()` por Dialog, `aria-live` nas mensagens de status.
- PWA (manifest e ícones), som/vibração quando for sua vez.
- Guia "como adicionar um jogo" (engine + módulo do front + catálogo + testes), para o próximo jogo do hub sair em dias.

## 5. Como validar localmente

```bash
docker compose up --build -d                    # jogo em http://localhost:8080
docker compose --profile test run --rm smoke    # 25 verificações dos dois jogos
docker compose -f docker-compose.dev.yml up     # hot reload em http://localhost:5173
```
