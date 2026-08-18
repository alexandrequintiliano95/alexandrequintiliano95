// Gera os SVGs animados do README a partir dos sprites em docs/sprites.js.
// Uso: node tools/build-assets.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { DINO_STAND, DINO_RUN_A, DINO_RUN_B, CACTUS, spriteToRects } from '../docs/sprites.js'
import { C, frame, txt, n } from './svg.mjs'

/* ------------------------------------------------------------------ banner */
function buildBanner() {
  const W = 900, H = 288, FS = 20, CW = 12, X = 30, LH = 30, TOP = 70, CYCLE = 14
  const lines = [
    { cmd: 'whoami', start: 0.3, end: 1.2 },
    { out: 'Alexandre Quintiliano', color: C.blue, bold: true, start: 1.4, end: 3.0 },
    { cmd: 'cat stack.txt', start: 3.2, end: 4.2 },
    { out: 'PHP · ADVPL · Python · JavaScript · SQL', color: C.mint, start: 4.4, end: 6.6 },
    { cmd: 'cat focus.txt', start: 6.8, end: 8.0 },
    { out: 'Backend · Frontend · ERP TOTVS Protheus · Integrações', color: C.sky, start: 8.2, end: 10.4 },
  ]

  const defs = []
  const body = []

  lines.forEach((ln, i) => {
    const y = TOP + i * LH
    const indent = ln.cmd ? 0 : 2 * CW
    const str = ln.cmd || ln.out
    const right = X + indent + (ln.cmd ? 2 * CW : 0) + str.length * CW + 6
    const full = n(right - 20)

    // Uma unica animacao por linha cobrindo o ciclo inteiro: a largura fica em 0
    // ate o instante de inicio, cresce durante a "digitacao" e segura ate o loop.
    defs.push(
      `<clipPath id="c${i}"><rect x="20" y="${y - FS - 4}" height="${LH + 2}" width="0">` +
      `<animate attributeName="width" dur="${CYCLE}s" repeatCount="indefinite" ` +
      `values="0;0;${full};${full}" keyTimes="0;${n(ln.start / CYCLE)};${n(ln.end / CYCLE)};1"/>` +
      `</rect></clipPath>`
    )

    // O prompt e desenhado como '$' sozinho, largura de 1 caractere, e o comando
    // comeca em X + 2*CW. O espaco vem da posicao, nao de um caractere: um '$ '
    // com espaco no fim seria descartado pelo XML e o textLength esticaria o
    // proprio cifrao ate 2 caracteres, colando ele no comando.
    const parts = []
    if (ln.cmd) {
      parts.push(txt(X, y, '$', { size: FS, cw: CW, fill: C.green, bold: true }))
      parts.push(txt(X + 2 * CW, y, ln.cmd, { size: FS, cw: CW, fill: C.text }))
    } else {
      parts.push(txt(X + indent, y, ln.out, { size: FS, cw: CW, fill: ln.color, bold: ln.bold }))
    }
    body.push(`<g clip-path="url(#c${i})">${parts.join('')}</g>`)
  })

  // Prompt final: o <g> aparece aos 10.6s e o <rect> interno pisca sempre.
  // Opacidades aninhadas se multiplicam, entao o cursor so pisca depois de surgir.
  const cy = TOP + 6 * LH
  body.push(
    `<g opacity="0">` +
    `<animate attributeName="opacity" dur="${CYCLE}s" repeatCount="indefinite" values="0;0;1;1" ` +
    `keyTimes="0;${n(10.6 / CYCLE)};${n(10.75 / CYCLE)};1"/>` +
    txt(X, cy, '$', { size: FS, cw: CW, fill: C.green, bold: true }) +
    `<rect x="${n(X + 2 * CW)}" y="${cy - FS + 4}" width="${n(CW)}" height="${FS}" fill="${C.green}">` +
    `<animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.49;0.5;0.99;1" dur="1.1s" repeatCount="indefinite"/>` +
    `</rect></g>`
  )

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Terminal: Alexandre Quintiliano, Desenvolvedor de Software, backend e frontend">
  <defs>${defs.join('')}</defs>
  ${frame(W, H, 'alexandre@github: ~/portfolio')}
  ${body.join('\n  ')}
</svg>
`
}

/* ---------------------------------------------------------------- neofetch */
function buildNeofetch() {
  const W = 900, FS = 14.5, CW = 8.7, LH = 22, X = 250, KEYW = 14
  const rows = [
    ['OS', 'Windows 11 · Ubuntu on WSL2'],
    ['Host', 'Dettalles Consultoria · Curitiba, PR'],
    ['Role', 'Desenvolvedor de Software · Backend & Frontend'],
    ['Uptime', '4+ anos escrevendo software em produção'],
    ['Languages', 'PHP · ADVPL · Python · JavaScript · SQL'],
    ['Frameworks', 'Laravel · Vue.js · Django · React · Flutter'],
    ['Database', 'MySQL · modelagem, tuning, integridade'],
    ['ERP', 'TOTVS Protheus · FIN, EST, FAT, COM'],
    ['Integrations', 'CNAB 240 · PIX · Boletos · CSV · REST'],
    ['Tools', 'Git · Docker · Laravel Mix · AutoCAD/Python'],
    ['Learning', 'Análise e Desenvolvimento de Sistemas'],
    ['Locale', 'pt_BR.UTF-8 · en_US (intermediate)'],
  ]
  const TOP = 70
  const H = TOP + (rows.length + 2) * LH + 56

  const body = [
    txt(X, TOP, 'alexandre@github', { size: FS, cw: CW, fill: C.green, bold: true }),
    txt(X, TOP + LH, '─'.repeat(52), { size: FS, cw: CW, fill: C.border }),
  ]

  rows.forEach(([k, v], i) => {
    const y = TOP + (i + 2) * LH
    body.push(txt(X, y, k, { size: FS, cw: CW, fill: C.blue, bold: true }))
    body.push(txt(X + KEYW * CW, y, v, { size: FS, cw: CW, fill: C.text }))
  })

  // Faixa de cores, igual ao rodape do neofetch de verdade.
  const palette = [C.red, C.yellow, C.lime, C.mint, C.sky, C.blue, C.purple, C.dim]
  const py = TOP + (rows.length + 2) * LH + 14
  palette.forEach((c, i) => {
    body.push(`<rect x="${X + i * 30}" y="${py}" width="24" height="14" rx="2" fill="${c}"/>`)
  })

  // Pixel art do dino: exatamente o mesmo sprite que roda no jogo.
  const px = 7
  const dino = spriteToRects(DINO_STAND, {
    x: 60,
    y: Math.round((H - 24 * px) / 2) + 8,
    px,
    fill: C.green,
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="neofetch com o perfil tecnico de Alexandre Quintiliano">
  ${frame(W, H, 'neofetch')}
  ${dino}
  ${body.join('\n  ')}
</svg>
`
}

/* -------------------------------------------------------- preview do jogo */
function buildPreview() {
  const W = 640, H = 190, PX = 3
  const GROUND = 150
  const DINO_X = 60
  const DINO_Y = GROUND - 24 * PX               // 78
  const cactusSprite = CACTUS.slice(6)          // 18 linhas
  const CACTUS_Y = GROUND - cactusSprite.length * PX // 96

  // Velocidade unica de 165 px/s amarra as tres animacoes:
  //  - o cacto cruza 700px (660 -> -40) em 4.2424s;
  //  - um cacto novo entra a cada 2.1212s (metade), e o dino pula nesse mesmo ritmo;
  //  - o cacto alcanca o dino em (660-60)/165 = 3.6364s, ou 1.5152s dentro do ciclo
  //    de pulo -> keyTime 0.7143, que e exatamente o apice.
  const SPEED = 165
  const CACTUS_DUR = 700 / SPEED
  const CYCLE = CACTUS_DUR / 2
  const jumpKeyTimes = [0, 0.554, 0.5941, 0.6341, 0.6742, 0.7143, 0.7544, 0.7944, 0.8345, 0.8745, 1]
  const jumpY = [78, 78, 49, 28, 16, 12, 16, 28, 49, 78, 78]

  const legFrames = `<g>
      ${spriteToRects(DINO_RUN_A, { x: 0, y: 0, px: PX, fill: C.green })}
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.49;0.5;1" dur="0.24s" repeatCount="indefinite"/>
    </g>
    <g opacity="0">
      ${spriteToRects(DINO_RUN_B, { x: 0, y: 0, px: PX, fill: C.green })}
      <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.49;0.5;1" dur="0.24s" repeatCount="indefinite"/>
    </g>`

  const cactus = (begin) => `<g transform="translate(660 ${CACTUS_Y})">
      <animateTransform attributeName="transform" type="translate" from="660 ${CACTUS_Y}" to="-40 ${CACTUS_Y}" dur="${n(CACTUS_DUR)}s" begin="${begin}" repeatCount="indefinite"/>
      ${spriteToRects(cactusSprite, { x: 0, y: 0, px: PX, fill: C.green })}
    </g>`

  // Chao tracejado com periodo de 90px: deslocar -90 em 90/165 = 0.5455s fecha o loop sem emenda.
  const dashes = Array.from({ length: 10 }, (_, i) => {
    const x = i * 90
    return `<rect x="${x}" y="${GROUND + 6}" width="46" height="3" fill="${C.border}"/>` +
      `<rect x="${x + 58}" y="${GROUND + 6}" width="18" height="3" fill="${C.border}"/>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Dinossauro pixelado pulando cactos: preview do jogo">
  ${frame(W, H, 'dino-run  ·  clique para jogar')}
  <defs><clipPath id="stage"><rect x="8" y="36" width="${W - 16}" height="${H - 44}" rx="6"/></clipPath></defs>
  <g clip-path="url(#stage)">
    <line x1="0" y1="${GROUND + 2}" x2="${W}" y2="${GROUND + 2}" stroke="${C.border}" stroke-width="2"/>
    <g transform="translate(0 0)">
      <animateTransform attributeName="transform" type="translate" from="0 0" to="-90 0" dur="${n(90 / SPEED)}s" repeatCount="indefinite"/>
      ${dashes}
    </g>
    ${cactus('0s')}
    ${cactus(`${n(CYCLE)}s`)}
    <g transform="translate(${DINO_X} ${DINO_Y})">
      <animateTransform attributeName="transform" type="translate" dur="${n(CYCLE)}s" repeatCount="indefinite"
        keyTimes="${jumpKeyTimes.join(';')}"
        values="${jumpY.map((y) => `${DINO_X} ${y}`).join(';')}"/>
      ${legFrames}
    </g>
  </g>
</svg>
`
}

mkdirSync('assets', { recursive: true })
writeFileSync('assets/banner.svg', buildBanner())
writeFileSync('assets/neofetch.svg', buildNeofetch())
writeFileSync('assets/dino-preview.svg', buildPreview())
console.log('ok -> assets/banner.svg, assets/neofetch.svg, assets/dino-preview.svg')
