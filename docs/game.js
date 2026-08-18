// dino-run — canvas puro, sem dependencias.
// Os sprites vem de sprites.js, o mesmo modulo que gera o dino do README.
import {
  DINO_STAND, DINO_RUN_A, DINO_RUN_B, DINO_DEAD,
  DINO_DUCK_A, DINO_DUCK_B,
  BIRD_UP, BIRD_DOWN,
  CACTUS, CACTUS_SMALL,
} from './sprites.js'

/* --------------------------------------------------------------- constantes */
const W = 660               // largura logica; o canvas escala por CSS
const H = 200
const GROUND_Y = 164        // linha do chao, em unidades logicas
const PX = 2                // tamanho do "pixel" do sprite
const DINO_X = 52

const GRAVITY = 3000        // px/s^2 -> apice de ~82px sobre um cacto de 48px
const JUMP_V = -700         // velocidade inicial do pulo (~0.47s no ar)
const SHORT_HOP = -340      // teto da velocidade ao soltar a tecla cedo
const DUCK_GRAVITY = 5200   // segurar baixo no ar acelera a queda

const SPEED_START = 340     // px/s
const SPEED_MAX = 900
const SPEED_ACCEL = 12      // px/s por segundo

const BIRD_AFTER = 150      // pontos ate o primeiro pterodatilo (~13s)
const NIGHT_EVERY = 400     // pontos por virada dia/noite (~30s)

const COLORS = {
  day: { fg: '#39d353', dim: '#30363d', sky: '#0d1117', text: '#e6edf3' },
  night: { fg: '#58a6ff', dim: '#243049', sky: '#080c14', text: '#cfe3ff' },
}

/* ------------------------------------------------------------------ sprites */
// Cada sprite vira uma lista de faixas horizontais, para nao desenhar
// um fillRect por pixel a 60fps.
function compile(sprite) {
  const runs = []
  sprite.forEach((row, y) => {
    let len = 0
    for (let x = 0; x <= row.length; x++) {
      if (row[x] === '#') { len++; continue }
      if (len > 0) { runs.push([x - len, y, len]); len = 0 }
    }
  })
  return { runs, w: sprite[0].length, h: sprite.length }
}

const S = {
  stand: compile(DINO_STAND),
  run: [compile(DINO_RUN_A), compile(DINO_RUN_B)],
  dead: compile(DINO_DEAD),
  duck: [compile(DINO_DUCK_A), compile(DINO_DUCK_B)],
  bird: [compile(BIRD_UP), compile(BIRD_DOWN)],
  cactus: compile(CACTUS),
  cactusSmall: compile(CACTUS_SMALL),
}

// Arredonda a origem: os obstaculos se movem em float e um fillRect fracionario
// gera antialias, o que borra a arte e mata o visual de pixel.
function blit(ctx, s, x, y, color, px = PX) {
  const bx = Math.round(x)
  const by = Math.round(y)
  ctx.fillStyle = color
  for (const [rx, ry, len] of s.runs) {
    ctx.fillRect(bx + rx * px, by + ry * px, len * px, px)
  }
}

/* -------------------------------------------------------------------- setup */
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const scoreEl = document.getElementById('score')
const hiEl = document.getElementById('hi')
const overlay = document.getElementById('overlay')
const overlayTitle = document.getElementById('overlay-title')
const overlayHint = document.getElementById('overlay-hint')

const HI_KEY = 'dino-run:hi'
const rnd = (a, b) => a + Math.random() * (b - a)

let hi = Number(localStorage.getItem(HI_KEY) || 0)
let state = 'ready'          // ready | running | over
let speed, distance, score, obstacles, clouds, stars, dino, nextSpawn, holdJump, night, shakeT

function reset() {
  speed = SPEED_START
  distance = 0
  score = 0
  obstacles = []
  clouds = Array.from({ length: 3 }, () => ({ x: rnd(W, W * 2), y: rnd(28, 78), s: rnd(0.4, 0.8) }))
  stars = Array.from({ length: 26 }, () => ({ x: rnd(0, W), y: rnd(16, 110), s: rnd(0.4, 1) }))
  dino = { y: GROUND_Y - S.stand.h * PX, vy: 0, ducking: false, onGround: true, frame: 0, legT: 0 }
  nextSpawn = 480
  holdJump = false
  night = false
  shakeT = 0
  setOverlay('ready')
}

function setOverlay(kind) {
  if (kind === 'ready') {
    overlay.hidden = false
    overlayTitle.textContent = 'dino-run'
    overlayHint.innerHTML = '<b>Espaço</b> ou <b>toque</b> para começar<br><span>Press <b>Space</b> or <b>tap</b> to start</span>'
  } else if (kind === 'over') {
    overlay.hidden = false
    overlayTitle.textContent = 'game over'
    overlayHint.innerHTML = `Pontuação <b>${score}</b> · recorde <b>${hi}</b><br><span><b>Espaço</b> para jogar de novo · <b>Space</b> to retry</span>`
  } else {
    overlay.hidden = true
  }
}

/* ---------------------------------------------------------------- obstaculos */
function spawn() {
  // Pterodatilos so entram depois que o jogador ja pegou o ritmo.
  const canBird = score > BIRD_AFTER && Math.random() < 0.28
  if (canBird) {
    // Tres alturas: rasante (pular), meio (abaixar) e alto (ignorar).
    const lane = [GROUND_Y - 34, GROUND_Y - 62, GROUND_Y - 88][Math.floor(rnd(0, 3))]
    obstacles.push({ kind: 'bird', x: W + 20, y: lane, w: S.bird[0].w * PX, h: S.bird[0].h * PX, t: 0 })
  } else {
    const big = Math.random() < 0.45
    const sprite = big ? S.cactus : S.cactusSmall
    const count = Math.random() < 0.3 ? 2 : Math.random() < 0.12 ? 3 : 1
    const gap = sprite.w * PX - 6
    for (let i = 0; i < count; i++) {
      obstacles.push({
        kind: 'cactus',
        sprite,
        x: W + 20 + i * gap,
        y: GROUND_Y - sprite.h * PX,
        w: sprite.w * PX,
        h: sprite.h * PX,
      })
    }
  }
  // Distancia ate o proximo grupo escala com a velocidade, senao fica
  // impossivel quando o jogo acelera.
  nextSpawn = rnd(1.15, 2.1) * speed
}

// AABB com folga: a hitbox e menor que o sprite, entao raspar de leve nao mata.
function hits(a, b) {
  const inset = 5
  return (
    a.x + inset < b.x + b.w - inset &&
    a.x + a.w - inset > b.x + inset &&
    a.y + inset < b.y + b.h - inset &&
    a.y + a.h - inset > b.y + inset
  )
}

/* --------------------------------------------------------------------- loop */
function update(dt) {
  speed = Math.min(SPEED_MAX, speed + SPEED_ACCEL * dt)
  distance += speed * dt
  score = Math.floor(distance / 35)
  night = Math.floor(score / NIGHT_EVERY) % 2 === 1

  // Dino
  const sprite = dino.ducking && dino.onGround ? S.duck[0] : S.stand
  const groundTop = GROUND_Y - sprite.h * PX

  if (!dino.onGround) {
    const g = dino.ducking ? DUCK_GRAVITY : GRAVITY
    dino.vy += g * dt
    // Soltar o pulo cedo corta o impulso -> pulo curto controlavel.
    if (!holdJump && dino.vy < SHORT_HOP) dino.vy = SHORT_HOP
    dino.y += dino.vy * dt
    if (dino.y >= groundTop) { dino.y = groundTop; dino.vy = 0; dino.onGround = true }
  } else {
    dino.y = groundTop
  }

  dino.legT += dt
  const cadence = dino.ducking ? 0.09 : Math.max(0.055, 0.12 - speed / 14000)
  if (dino.legT > cadence) { dino.legT = 0; dino.frame ^= 1 }

  // Cenario
  for (const c of clouds) {
    c.x -= speed * 0.22 * dt
    if (c.x < -70) { c.x = W + rnd(20, 200); c.y = rnd(28, 78) }
  }

  // Obstaculos
  nextSpawn -= speed * dt
  if (nextSpawn <= 0) spawn()

  const hitbox = {
    x: DINO_X, y: dino.y,
    w: sprite.w * PX, h: sprite.h * PX,
  }

  for (const o of obstacles) {
    o.x -= speed * dt
    if (o.kind === 'bird') {
      o.t += dt
      o.x -= speed * 0.18 * dt   // o passaro voa contra o jogador, mais rapido
    }
    if (hits(hitbox, o)) return gameOver()
  }
  obstacles = obstacles.filter((o) => o.x + o.w > -30)

  if (score > hi) { hi = score; localStorage.setItem(HI_KEY, String(hi)) }
  scoreEl.textContent = String(score).padStart(5, '0')
  hiEl.textContent = String(hi).padStart(5, '0')
}

function draw() {
  const c = night ? COLORS.night : COLORS.day
  ctx.fillStyle = c.sky
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  if (shakeT > 0) {
    ctx.translate(rnd(-2, 2), rnd(-2, 2))
    shakeT -= 1
  }

  if (night) {
    ctx.fillStyle = c.dim
    for (const s of stars) ctx.fillRect(s.x, s.y, s.s * 2, s.s * 2)
  }

  // Nuvens
  ctx.fillStyle = c.dim
  for (const cl of clouds) {
    const w = 30 * cl.s, h = 8 * cl.s
    ctx.fillRect(cl.x, cl.y, w, h)
    ctx.fillRect(cl.x + w * 0.25, cl.y - h * 0.8, w * 0.5, h * 0.8)
  }

  // Chao: linha continua + tracos que rolam com a distancia
  ctx.fillStyle = c.dim
  ctx.fillRect(0, GROUND_Y, W, 2)
  const off = distance % 90
  for (let x = -off; x < W; x += 90) {
    ctx.fillRect(x, GROUND_Y + 6, 46, 2)
    ctx.fillRect(x + 58, GROUND_Y + 6, 18, 2)
  }

  // Obstaculos
  for (const o of obstacles) {
    if (o.kind === 'bird') {
      blit(ctx, S.bird[Math.floor(o.t * 7) % 2], o.x, o.y, c.fg)
    } else {
      blit(ctx, o.sprite, o.x, o.y, c.fg)
    }
  }

  // Dino
  let s
  if (state === 'over') s = S.dead
  else if (dino.ducking && dino.onGround) s = S.duck[dino.frame]
  else if (!dino.onGround) s = S.stand
  else if (state === 'running') s = S.run[dino.frame]
  else s = S.stand
  blit(ctx, s, DINO_X, dino.y, c.fg)

  ctx.restore()
}

let last = 0
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0)
  last = now
  if (state === 'running') update(dt)
  draw()
  requestAnimationFrame(frame)
}

/* -------------------------------------------------------------------- input */
function start() {
  if (state === 'running') return
  if (state === 'over') reset()
  state = 'running'
  setOverlay(null)
  jump()
}

function jump() {
  if (state !== 'running' || !dino.onGround) return
  dino.vy = JUMP_V
  dino.onGround = false
  dino.ducking = false
  holdJump = true
}

function gameOver() {
  state = 'over'
  shakeT = 8
  setOverlay('over')
}

function onDown(e) {
  const k = e.code
  if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'Enter') {
    e.preventDefault()
    if (state === 'running') jump()
    else start()
  } else if (k === 'ArrowDown' || k === 'KeyS') {
    e.preventDefault()
    if (state === 'running') dino.ducking = true
  }
}

function onUp(e) {
  const k = e.code
  if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') holdJump = false
  if (k === 'ArrowDown' || k === 'KeyS') dino.ducking = false
}

document.addEventListener('keydown', onDown)
document.addEventListener('keyup', onUp)

// Toque: metade de baixo abaixa, resto pula. Funciona com mouse tambem.
function pointerDown(e) {
  e.preventDefault()
  if (state !== 'running') return start()
  const rect = canvas.getBoundingClientRect()
  const py = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
  if (py > rect.height * 0.62) dino.ducking = true
  else jump()
}
function pointerUp() { holdJump = false; dino.ducking = false }

canvas.addEventListener('pointerdown', pointerDown)
canvas.addEventListener('pointerup', pointerUp)
canvas.addEventListener('pointercancel', pointerUp)
overlay.addEventListener('pointerdown', (e) => { e.preventDefault(); start() })

// requestAnimationFrame congela em aba oculta. Zerar o relogio na volta evita
// um dt gigante que teleportaria o dino para dentro de um cacto.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) last = performance.now()
})

/* ------------------------------------------------------------------- render */
// Canvas em resolucao de dispositivo: nitido em tela retina, sem borrar o pixel art.
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
}
window.addEventListener('resize', resize)

resize()
reset()
hiEl.textContent = String(hi).padStart(5, '0')
scoreEl.textContent = '00000'
requestAnimationFrame(frame)
