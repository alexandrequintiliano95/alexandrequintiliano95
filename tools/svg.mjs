// Peças compartilhadas pelos geradores de SVG (build-assets, build-stats).
// Manter a moldura e a tipografia num lugar só é o que faz os assets
// parecerem o mesmo terminal, e não três desenhos parecidos.

export const C = {
  bg: '#0d1117',
  bar: '#161b22',
  border: '#30363d',
  dim: '#8b949e',
  text: '#e6edf3',
  green: '#39d353',
  blue: '#58a6ff',
  mint: '#7ee787',
  sky: '#79c0ff',
  purple: '#d2a8ff',
  orange: '#ffa657',
  red: '#ff5f56',
  yellow: '#ffbd2e',
  lime: '#27c93f',
}

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const n = (v) => Number(Number(v).toFixed(4))

// Moldura de terminal com barra de título e os três pontos.
export function frame(w, h, title) {
  return [
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>`,
    `<path d="M1 11a10 10 0 0 1 10-10h${w - 22}a10 10 0 0 1 10 10v23H1z" fill="${C.bar}"/>`,
    `<line x1="1" y1="34" x2="${w - 1}" y2="34" stroke="${C.border}" stroke-width="1.5"/>`,
    `<circle cx="22" cy="17.5" r="5.5" fill="${C.red}"/>`,
    `<circle cx="41" cy="17.5" r="5.5" fill="${C.yellow}"/>`,
    `<circle cx="60" cy="17.5" r="5.5" fill="${C.lime}"/>`,
    `<text x="${w / 2}" y="22" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.dim}">${esc(title)}</text>`,
  ].join('\n  ')
}

// textLength + lengthAdjust travam a largura real do texto. Isso mantém o
// alinhamento em qualquer renderizador, mesmo que a fonte mono disponível
// tenha avanço diferente — e é o que faz a matemática do clip de digitação
// do banner continuar válida fora do navegador onde foi testada.
export function txt(x, y, str, { size, cw, fill, bold, anchor } = {}) {
  return (
    `<text x="${n(x)}" y="${y}" textLength="${n(String(str).length * cw)}" lengthAdjust="spacingAndGlyphs" ` +
    `font-family="${MONO}" font-size="${size}" fill="${fill}"` +
    (bold ? ' font-weight="700"' : '') +
    (anchor ? ` text-anchor="${anchor}"` : '') +
    `>${esc(str)}</text>`
  )
}
