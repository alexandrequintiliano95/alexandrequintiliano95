// Gera o card de estatisticas (dist/stats.svg) a partir da API do GitHub.
//
// Existe para substituir o github-readme-stats: aquele serviço é de terceiros,
// vive caindo e leva o README junto (checado em 18/08/2026: HTTP 503). Aqui os
// dados são buscados pela Action do próprio repositório e o SVG é publicado na
// branch `output`, então o card nunca depende de um servidor que não é seu.
//
// Uso: GITHUB_TOKEN=... GITHUB_LOGIN=alexandrequintiliano95 node tools/build-stats.mjs
// Para so olhar o layout, sem token: node tools/build-stats.mjs --placeholder
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { C, MONO, frame, txt, esc, n } from './svg.mjs'

const LOGIN = process.env.GITHUB_LOGIN || 'alexandrequintiliano95'
// A Action aponta OUT para dist/, que e publicado na branch `output`.
const OUT = process.env.OUT || 'dist/stats.svg'
const TOKEN = process.env.GITHUB_TOKEN
// --placeholder desenha o card com traços no lugar dos números. Serve para
// iterar no layout localmente sem precisar de um token do GitHub.
const PLACEHOLDER = process.argv.includes('--placeholder')

if (!TOKEN && !PLACEHOLDER) {
  console.error('Faltou GITHUB_TOKEN. Na Action ele vem de secrets.GITHUB_TOKEN.')
  process.exit(1)
}

const QUERY = `
query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    pullRequests { totalCount }
    issues { totalCount }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 12, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`

async function fetchStats() {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'perfil-readme-stats',
    },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  })
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status} ${res.statusText}`)

  const json = await res.json()
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '))

  const u = json.data.user
  const repos = u.repositories.nodes

  // Soma os bytes por linguagem entre todos os repositórios próprios.
  const bytes = new Map()
  const colors = new Map()
  for (const r of repos) {
    for (const { size, node } of r.languages.edges) {
      bytes.set(node.name, (bytes.get(node.name) || 0) + size)
      if (node.color) colors.set(node.name, node.color)
    }
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0)
  const langs = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, size]) => ({
      name,
      pct: total ? (size / total) * 100 : 0,
      color: colors.get(name) || C.dim,
    }))

  return {
    repos: u.repositories.totalCount,
    stars: repos.reduce((a, r) => a + r.stargazerCount, 0),
    commits:
      u.contributionsCollection.totalCommitContributions +
      u.contributionsCollection.restrictedContributionsCount,
    prs: u.pullRequests.totalCount,
    issues: u.issues.totalCount,
    followers: u.followers.totalCount,
    langs,
  }
}

function render(s, atualizadoEm) {
  const W = 900, H = 316
  const FS = 14.5, CW = 8.7, LH = 26
  const LEFT = 44, RIGHT = 470, TOP = 78

  const rows = [
    ['Repositórios públicos', s.repos, C.mint],
    ['Estrelas recebidas', s.stars, C.yellow],
    ['Commits (último ano)', s.commits, C.green],
    ['Pull requests', s.prs, C.sky],
    ['Issues abertas', s.issues, C.purple],
    ['Seguidores', s.followers, C.orange],
  ]

  const body = [
    txt(LEFT, TOP - 26, '$ gh api --stats', { size: FS, cw: CW, fill: C.green, bold: true }),
  ]

  rows.forEach(([label, value, color], i) => {
    const y = TOP + i * LH
    body.push(txt(LEFT, y, label, { size: FS, cw: CW, fill: C.dim }))
    // Pontilhado de guia entre o rótulo e o número, como num sumário.
    const dots = Math.max(2, 26 - label.length)
    body.push(txt(LEFT + (label.length + 1) * CW, y, '.'.repeat(dots), { size: FS, cw: CW, fill: C.border }))
    body.push(
      txt(LEFT + 30 * CW, y, String(value), { size: FS, cw: CW, fill: color, bold: true })
    )
  })

  body.push(txt(RIGHT, TOP - 26, '$ gh api --languages', { size: FS, cw: CW, fill: C.green, bold: true }))

  const BAR_W = 250
  s.langs.forEach((l, i) => {
    const y = TOP + i * LH
    body.push(txt(RIGHT, y, l.name, { size: FS, cw: CW, fill: C.text }))
    const pct = l.pct.toFixed(1) + '%'
    body.push(txt(RIGHT + 358 - pct.length * CW, y, pct, { size: FS, cw: CW, fill: C.dim }))
    // Trilho + preenchimento proporcional.
    body.push(`<rect x="${RIGHT}" y="${y + 6}" width="${BAR_W}" height="6" rx="3" fill="${C.border}"/>`)
    body.push(
      `<rect x="${RIGHT}" y="${y + 6}" width="${n(Math.max(3, (BAR_W * l.pct) / 100))}" height="6" rx="3" fill="${l.color}"/>`
    )
  })

  if (!s.langs.length) {
    body.push(txt(RIGHT, TOP, 'sem repositórios públicos ainda', { size: FS, cw: CW, fill: C.border }))
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Estatísticas do GitHub de ${esc(LOGIN)}: ${s.repos} repositórios, ${s.stars} estrelas, ${s.commits} commits no último ano">
  ${frame(W, H, `gh stats — ${LOGIN}`)}
  ${body.join('\n  ')}
  <text x="${W - 24}" y="${H - 18}" text-anchor="end" font-family="${MONO}" font-size="11.5" fill="${C.border}">atualizado em ${esc(atualizadoEm)}</text>
</svg>
`
}

const stats = PLACEHOLDER
  ? { repos: '—', stars: '—', commits: '—', prs: '—', issues: '—', followers: '—', langs: [] }
  : await fetchStats()

const quando = PLACEHOLDER
  ? 'aguardando a primeira execução da Action'
  : new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
    }).format(new Date())

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, render(stats, quando))
console.log(`ok -> ${OUT}`, PLACEHOLDER ? '(placeholder)' : JSON.stringify(stats))
