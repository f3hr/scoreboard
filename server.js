import { createServer } from 'http'
import { promises as fs } from 'fs'
import { dirname, extname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { performance } from 'node:perf_hooks'
import { WebSocketServer } from 'ws'
import { config as loadEnv } from 'dotenv'

import {
  createInitialState,
  serializeState,
  applyAction,
  sanitizeLogoPath,
} from './src/shared/scoreboard.js'

loadEnv()
const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 8080
const SOCKET_PATH = process.env.SOCKET_PATH || process.env.VITE_SOCKET_PATH || '/socket'
const MAX_MESSAGE_BYTES = Number(process.env.MAX_MESSAGE_BYTES) || 1024
const LOGO_ENDPOINT = '/api/logos'
const LOGO_ROOT = 'logos'
const LOGO_URL_PREFIX = `/${LOGO_ROOT}/`
const LOGO_DIR = resolve(__dirname, 'public', LOGO_ROOT)
const MAX_LOGO_BYTES = Number(process.env.MAX_LOGO_BYTES) || 750 * 1024
const LOGO_EXTENSION_FROM_MIME = {
  'image/png': '.png',
  'image/webp': '.webp',
}
const LOGO_ALLOWED_EXTENSIONS = new Set(['png', 'webp'])

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

const state = createInitialState()
state.homePenalties = []
state.awayPenalties = []

const clients = new Set()
let lastTickTs = null
let shuttingDown = false

const server = createServer(serveStatic)
const wss = new WebSocketServer({ noServer: true })

async function serveStatic(req, res) {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`) // index.html als Fallback

    if (req.method === 'POST' && url.pathname === LOGO_ENDPOINT) {
      await handleLogoUpload(req, res)
      return
    }

    if (req.method === 'DELETE' && url.pathname === LOGO_ENDPOINT) {
      await handleLogoDelete(req, res, url)
      return
    }

    if (url.pathname.startsWith(LOGO_URL_PREFIX)) {
      await serveLogoFile(url.pathname, res)
      return
    }

    const file = await pickFile(url.pathname)
    const data = await fs.readFile(file)
    const type = MIME_TYPES[extname(file)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type })
    res.end(data)
  } catch (error) {
    if (error?.status === 403) {
      res.writeHead(403).end('Forbidden')
      return
    }
    console.error(error)
    res.writeHead(500).end('Internal Server Error')
  }
}

async function pickFile(pathname) {
  const target = resolveSafePath(pathname === '/' ? '/index.html' : pathname)
  try {
    const stats = await fs.stat(target)
    if (stats.isDirectory()) {
      return join(target, 'index.html')
    }
    return target
  } catch {
    return join(DIST_DIR, 'index.html')
  }
}

function resolveSafePath(pathname) {
  const filePath = resolve(DIST_DIR, `.${pathname}`)
  if (!filePath.startsWith(DIST_DIR)) {
    const error = new Error('Forbidden')
    error.status = 403
    throw error
  }
  return filePath
}

function createHttpError(status, message) {
  const error = new Error(message || 'Error')
  error.status = status
  return error
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload ?? {}))
}

async function readJsonBody(req, limitBytes = 0) {
  const maxBytes = Number(limitBytes) || 0
  req.setEncoding?.('utf8')
  let total = 0
  const chunks = []
  for await (const chunk of req) {
    const piece = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    total += piece.length
    if (maxBytes && total > maxBytes) {
      throw createHttpError(413, 'Payload zu gross')
    }
    chunks.push(piece)
  }
  return chunks.join('')
}

function resolveLogoExtension(mimeType, fileName) {
  const lowerMime = typeof mimeType === 'string' ? mimeType.toLowerCase() : ''
  const fromMime = LOGO_EXTENSION_FROM_MIME[lowerMime]
  if (fromMime) return fromMime
  const ext = fileName?.split('.')?.pop()?.toLowerCase() || ''
  return LOGO_ALLOWED_EXTENSIONS.has(ext) ? `.${ext}` : null
}

function slugify(value) {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9a-z]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function buildLogoFilename(team, extension, originalName) {
  const fallback = team === 'away' ? 'away-logo' : 'logo'
  const teamSlug = slugify(team)
  const baseSlug = slugify(originalName?.replace(/\.[^/.]+$/, ''))
  const timestamp = Date.now().toString(36)
  const combined = [teamSlug, baseSlug, timestamp].filter(Boolean).join('-') || fallback
  const trimmed = combined.length > 80 ? combined.slice(0, 80) : combined
  const safeBase = trimmed.replace(/-+$/g, '') || fallback
  return `${safeBase}${extension}`
}

async function ensureLogoDirectory() {
  await fs.mkdir(LOGO_DIR, { recursive: true })
}

function resolveLogoFile(pathname) {
  const normalized = pathname.replace(/\\/g, '/').replace(/^\/+/, '')
  const candidate = normalized.startsWith(`${LOGO_ROOT}/`) ? normalized : `${LOGO_ROOT}/${normalized}`
  const sanitized = sanitizeLogoPath(candidate)
  if (!sanitized) {
    throw createHttpError(403, 'Forbidden')
  }
  const relative = sanitized.slice(LOGO_ROOT.length + 1)
  const filePath = resolve(LOGO_DIR, relative)
  if (!filePath.startsWith(LOGO_DIR)) {
    throw createHttpError(403, 'Forbidden')
  }
  return filePath
}

async function removeLogoFile(publicPath) {
  const sanitized = sanitizeLogoPath(publicPath)
  if (!sanitized) return
  const relative = sanitized.slice(LOGO_ROOT.length + 1)
  const filePath = resolve(LOGO_DIR, relative)
  if (!filePath.startsWith(LOGO_DIR)) return
  try {
    await fs.unlink(filePath)
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('Logo removal failed', error)
    }
  }
}

async function serveLogoFile(pathname, res) {
  try {
    const filePath = resolveLogoFile(pathname)
    const data = await fs.readFile(filePath)
    const type = MIME_TYPES[extname(filePath)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type })
    res.end(data)
  } catch (error) {
    if (error?.status === 403) {
      res.writeHead(403).end('Forbidden')
      return
    }
    if (error?.code === 'ENOENT') {
      res.writeHead(404).end('Not Found')
      return
    }
    console.error('Serve logo failed', error)
    res.writeHead(500).end('Internal Server Error')
  }
}

async function handleLogoUpload(req, res) {
  try {
    const raw = await readJsonBody(req, MAX_LOGO_BYTES * 4)
    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      throw createHttpError(400, 'Ungueltiges JSON')
    }

    const team = payload?.team === 'away' ? 'away' : null
    if (!team) throw createHttpError(400, 'Unbekanntes Team')

    const extension = resolveLogoExtension(payload?.mimeType, payload?.name)
    if (!extension) throw createHttpError(400, 'Dateityp nicht erlaubt')

    const base64 = typeof payload?.data === 'string' ? payload.data : ''
    if (!base64) throw createHttpError(400, 'Keine Bilddaten erhalten')

    let buffer
    try {
      buffer = Buffer.from(base64, 'base64')
    } catch {
      throw createHttpError(400, 'Ungueltige Bilddaten')
    }

    if (!buffer?.length) throw createHttpError(400, 'Leere Bilddaten')
    if (buffer.length > MAX_LOGO_BYTES) throw createHttpError(413, 'Logo ist zu gross')

    await ensureLogoDirectory()
    const filename = buildLogoFilename(team, extension, payload?.name)
    const filePath = resolve(LOGO_DIR, filename)
    await fs.writeFile(filePath, buffer)

    const previous = state.awayLogo
    await removeLogoFile(previous)

    const publicPath = `${LOGO_ROOT}/${filename}`
    const result = applyAction(state, { type: 'SET_AWAY_LOGO', payload: publicPath })
    if (result?.changed) {
      broadcastState()
    }

    sendJson(res, 200, { path: publicPath })
  } catch (error) {
    handleLogoError(res, error)
  }
}

async function handleLogoDelete(req, res, url) {
  try {
    const teamParam = url.searchParams.get('team')
    if (teamParam !== 'away') throw createHttpError(400, 'Unbekanntes Team')

    const previous = state.awayLogo
    await removeLogoFile(previous)

    const result = applyAction(state, { type: 'SET_AWAY_LOGO', payload: '' })
    if (result?.changed) {
      broadcastState()
    }

    sendJson(res, 200, { ok: true })
  } catch (error) {
    handleLogoError(res, error)
  }
}

function handleLogoError(res, error) {
  const status = error?.status || 500
  if (status >= 500) {
    console.error('Logo request failed', error)
  }
  const message = status >= 500 ? 'Internal Server Error' : error?.message || 'Unbekannter Fehler'
  sendJson(res, status, { error: message })
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw.toString())
  } catch {
    return null
  }
}

function coerceTickDelta(payload) {
  const numeric = Number(payload)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  const now = performance.now()
  const elapsed = lastTickTs != null ? now - lastTickTs : numeric
  lastTickTs = now
  return Math.max(0, Math.min(numeric, elapsed))
}

function dispatchAction(type, payload) {
  if (type === 'CLOCK_TICK') {
    if (!state.running) return { changed: false }
    const delta = coerceTickDelta(payload)
    if (delta === 0) return { changed: false }
    const result = applyAction(state, { type, payload: delta })
    if (!state.running) {
      lastTickTs = null
    }
    return result
  }

  const result = applyAction(state, { type, payload })
  if (result?.changed) {
    if (type === 'RUN') {
      lastTickTs = performance.now()
    } else if (type === 'STOP' || type === 'RESET_CLOCK' || type === 'SET_CLOCK') {
      lastTickTs = null
    }
  }
  return result
}

function broadcastState() {
  const snapshot = JSON.stringify({ type: 'STATE_SYNC', payload: serializeState(state) })
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(snapshot)
    }
  }
}

function handleSocketMessage(socket, raw) {
  const rawSize =
    typeof raw === 'string'
      ? Buffer.byteLength(raw)
      : raw?.byteLength ?? raw?.length ?? 0
  if (rawSize > MAX_MESSAGE_BYTES) {
    socket.send(JSON.stringify({ type: 'ERROR', error: 'Nachricht zu gross' }))
    socket.close(1009, 'payload too large')
    return
  }

  const message = parseMessage(raw)
  if (!message) {
    socket.send(JSON.stringify({ type: 'ERROR', error: 'Ungueltige Nachricht' }))
    return
  }

  const { type, payload } = message

  if (type === 'PING') {
    socket.send(JSON.stringify({ type: 'PONG' }))
    return
  }

  if (type === 'REQUEST_STATE') {
    socket.send(JSON.stringify({ type: 'STATE_SYNC', payload: serializeState(state) }))
    return
  }

  const result = dispatchAction(type, payload)
  if (result?.error) {
    socket.send(JSON.stringify({ type: 'ERROR', error: result.error }))
    return
  }

  if (result?.changed) {
    if (!state.running) {
      lastTickTs = null
    }
    broadcastState()
  }
}

wss.on('connection', (socket) => {
  clients.add(socket)
  socket.send(JSON.stringify({ type: 'STATE_SYNC', payload: serializeState(state) }))
  socket.on('message', (raw) => handleSocketMessage(socket, raw))
  socket.on('close', () => {
    clients.delete(socket)
  })
})

server.on('upgrade', (request, socket, head) => {
  try {
    if (shuttingDown) {
      socket.destroy()
      return
    }
    const { pathname } = new URL(request.url || '/', `http://${request.headers.host}`)
    if (pathname === SOCKET_PATH) {
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request))
    } else {
      socket.destroy()
    }
  } catch (error) {
    console.error('Upgrade error', error)
    socket.destroy()
  }
})

server.listen(PORT, () => {
  console.log(`WebSocket path ${SOCKET_PATH}`)
  console.log(`Controller: http://127.0.0.1:${PORT}/controller.html`)
})

async function gracefulShutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n${signal} received, shutting down...`)
  for (const client of clients) {
    try {
      client.close(1001, 'server shutdown')
    } catch (err) {
      console.error('Close client error', err)
    }
  }
  wss.close?.()
  server.close(() => {
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 5000).unref()
}

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => gracefulShutdown(sig))
})
