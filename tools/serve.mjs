// Servidor estatico minimo para rodar o jogo e conferir os SVGs localmente.
// Uso: node tools/serve.mjs   ->   http://localhost:4173/docs/
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const ROOT = process.cwd()
const PORT = Number(process.env.PORT || 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (path.endsWith('/')) path += 'index.html'

  // normalize + prefixo travam o classico ../../etc/passwd.
  const file = normalize(join(ROOT, path))
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden')
    return
  }

  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + path)
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/docs/`))
