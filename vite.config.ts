import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Lokaler Ersatz für die Vercel-Funktionen: Anfragen an /api/* werden im
 * Entwicklungsserver an die Dateien im Ordner api/ weitergereicht. In der
 * Produktion übernimmt Vercel diese Aufgabe – dort wird dieses Plugin nicht genutzt.
 */
function devApi(): Plugin {
  return {
    name: 'schulhub-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
        const route = url.pathname.replace(/^\/api\//, '').replace(/[^a-z0-9/_-]/gi, '')
        const file = resolve(__dirname, 'api', `${route}.ts`)
        if (route.startsWith('_') || route.includes('/_') || !existsSync(file)) {
          res.statusCode = 404
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Nicht gefunden' }))
          return
        }
        try {
          const mod = await server.ssrLoadModule(file)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.end()
            return
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') headers.set(k, v)
            else if (Array.isArray(v)) headers.set(k, v.join(', '))
          }
          const body = chunks.length && req.method !== 'GET' ? Buffer.concat(chunks) : undefined
          const response: Response = await handler(new Request(url, { method: req.method, headers, body }))
          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value)
          })
          const cookies = response.headers.getSetCookie()
          if (cookies.length) res.setHeader('set-cookie', cookies)
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          console.error('[api]', route, err instanceof Error ? err.message : err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Interner Fehler' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Server-Variablen aus .env für die lokalen API-Funktionen bereitstellen.
  // Sie landen NICHT im Browser-Code (dafür müssten sie mit VITE_ beginnen).
  Object.assign(process.env, loadEnv(mode, __dirname, ''))
  return {
    plugins: [react(), tailwindcss(), devApi()],
  }
})
