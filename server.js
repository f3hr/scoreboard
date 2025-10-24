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
} from './src/shared/scoreboard.js'

loadEnv()
const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = resolve(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 8080
const SOCKET_PATH = process.env.SOCKET_PATH || process.env.VITE_SOCKET_PATH || '/socket'
const MAX_MESSAGE_BYTES = Number(process.env.MAX_MESSAGE_BYTES) || 1024

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
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
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
  console.log(`Controller on http://127.0.0.1:${PORT}/controller.html`)
  console.log(`WebSocket path ${SOCKET_PATH}`)
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
