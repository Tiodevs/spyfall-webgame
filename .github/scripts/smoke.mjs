// Testes de fumaça de um ambiente publicado da Roda.
//
// Uso: node .github/scripts/smoke.mjs <origem-do-frontend> <origem-do-backend> [commit]
//   node .github/scripts/smoke.mjs https://spyfall.mefelipe.com.br https://spyfall-webgame-production.up.railway.app
//
// Confere o que o teste do jogo (frontend/roda-game-test.mjs) não vê: qual versão do backend
// está no ar, se o backend aceita a origem do frontend (CORS) e se o frontend publicado aponta
// para o backend do mesmo ambiente.
// Com o commit, espera o /health do backend responder com ele antes de testar. A Railway mantém
// a versão anterior no ar quando um deploy falha, e sem essa espera a fumaça aprovaria a antiga.
// Sai com código 1 se alguma verificação falhar, com a lista do que falhou.
//
// Quem usa: os dois jobs do deploy.yml, depois de cada publicação, e quem opera, à mão, depois
// de um rollback. Só usa o `fetch` do Node, sem dependências. Argumentos inválidos saem com
// código 2, antes de qualquer pedido.

// As origens chegam sem a barra do fim, para os caminhos abaixo serem concatenados direto.
const web = (process.argv[2] ?? '').trim().replace(/\/+$/, '')
const api = (process.argv[3] ?? '').trim().replace(/\/+$/, '')
const expectedBuild = (process.argv[4] ?? '').trim()
const originOnly = /^https?:\/\/[^/]+$/
if (!originOnly.test(web) || !originOnly.test(api)) {
  console.error('Informe as origens do frontend e do backend, sem caminho. Exemplo:')
  console.error('  node .github/scripts/smoke.mjs https://jogos.exemplo.com https://api.exemplo.com [commit]')
  process.exit(2)
}

// Prazo de cada pedido.
const requestTimeoutMs = 20_000
// As mensagens das verificações que falharam, contadas no resumo do fim.
const failures = []

/** Registra uma verificação: `ok` na saída padrão, ou `FALHOU` no erro padrão e em `failures`. */
function check(condition, message) {
  if (condition) {
    console.log(`ok      ${message}`)
  } else {
    failures.push(message)
    console.error(`FALHOU  ${message}`)
  }
}

/**
 * Um pedido com o prazo de `requestTimeoutMs`. Não segue redirecionamento, para um 3xx não
 * chegar como o 200 da página de destino.
 */
function get(url, init = {}) {
  return fetch(url, { redirect: 'manual', ...init, signal: AbortSignal.timeout(requestTimeoutMs) })
}

/** O corpo como JSON, ou `null` quando ele não é JSON, como uma página de erro. */
async function json(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/** Espera um 200 que passe em `accept`. Devolve a última resposta ou o último erro. */
async function waitFor(url, { attempts, delayMs, accept = () => true }) {
  let last = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await get(url)
      last = response
      if (response.status === 200 && (await accept(response.clone()))) {
        return response
      }
    } catch (error) {
      last = error
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  return last
}

/** O status de uma resposta, ou o texto do erro quando o pedido nem chegou. */
function describe(result) {
  return result instanceof Response ? `respondeu ${result.status}` : `falhou: ${String(result)}`
}

// 1. O backend está no ar, na versão esperada.
// Com o commit, até 60 tentativas a cada 10 s: 10 minutos para a Railway trocar a versão depois
// do build. Sem ele, 2 minutos bastam.
const health = await waitFor(`${api}/health`, {
  attempts: expectedBuild ? 60 : 12,
  delayMs: 10_000,
  accept: async (response) => !expectedBuild || (await json(response))?.build === expectedBuild,
})
check(
  health instanceof Response && health.status === 200,
  `GET ${api}/health responde 200 (${describe(health)})`,
)
if (expectedBuild && health instanceof Response) {
  const body = await json(health)
  check(
    body?.build === expectedBuild,
    `o backend no ar é o do commit ${expectedBuild} (respondeu ${body?.build ?? 'sem commit'})`,
  )
}

// 2. Os dois jogos estão registrados no backend.
try {
  const games = (await json(await get(`${api}/api/games`)))?.games ?? []
  check(
    games.includes('spyfall') && games.includes('quem-sou-eu'),
    `GET /api/games lista spyfall e quem-sou-eu (veio ${JSON.stringify(games)})`,
  )
} catch (error) {
  check(false, `GET /api/games responde (falhou: ${String(error)})`)
}

// 3. O backend aceita a origem do frontend.
// É o handshake que o navegador faz ao abrir o jogo. Sem a origem no ALLOWED_ORIGINS da
// Railway, o cabeçalho `access-control-allow-origin` não vem e o navegador bloqueia a conexão.
try {
  const handshake = await get(`${api}/socket.io/?EIO=4&transport=polling`, {
    headers: { Origin: web },
  })
  const allowed = handshake.headers.get('access-control-allow-origin')
  check(
    handshake.status === 200 && (await handshake.text()).includes('"sid"'),
    `o handshake do Socket.io responde 200 (respondeu ${handshake.status})`,
  )
  check(
    allowed === web,
    `o backend aceita a origem ${web} no CORS (ALLOWED_ORIGINS; veio ${allowed ?? 'nenhuma'})`,
  )
} catch (error) {
  check(false, `o handshake do Socket.io responde (falhou: ${String(error)})`)
}

// 4. O frontend está no ar e aponta para este backend.
// Até 1 minuto para o domínio servir a implantação nova. Um 401 aqui costuma ser a proteção de
// deployments da Vercel, que não vale para domínio próprio.
const page = await waitFor(`${web}/`, { attempts: 6, delayMs: 10_000 })
check(page instanceof Response && page.status === 200, `GET ${web}/ responde 200 (${describe(page)})`)
if (page instanceof Response && page.status === 200) {
  const html = await page.text()
  check(html.includes('id="root"'), 'a página é a SPA da Roda')
  // O endereço do backend entra no build, pelo VITE_SOCKET_URL. Um build com o endereço de outro
  // ambiente abriria o jogo de development falando com o backend de produção, ou o contrário.
  const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((match) => match[1])
  let pointsToApi = false
  for (const script of scripts) {
    try {
      const bundle = await get(`${web}${script}`)
      if (bundle.status === 200 && (await bundle.text()).includes(api)) {
        pointsToApi = true
        break
      }
    } catch (error) {
      console.error(`Não deu para ler ${script}: ${String(error)}`)
    }
  }
  check(
    pointsToApi,
    `o JavaScript do frontend aponta para ${api} (${scripts.length} arquivo(s) conferido(s))`,
  )
}

if (failures.length > 0) {
  console.error(`\n${failures.length} verificação(ões) falharam em ${web}.`)
  process.exit(1)
}
console.log(`\nFumaça verde em ${web}.`)
