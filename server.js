import { createServer } from 'http'
import { promises as fs } from 'fs'
import { dirname, extname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { performance } from 'node:perf_hooks'
import { WebSocketServer } from 'ws'

import {
  createInitialState,
  serializeState,
  applyAction,
} from './src/shared/scoreboard.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, 'dist')
const port = Number(process.env.PORT) || 8080

const mimeTypes = {
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

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    let pathname = url.pathname
    if (pathname === '/') pathname = '/index.html'

    const filePath = resolve(distDir, `.${pathname}`)
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403).end('Forbidden')
      return
    }

    let file = filePath
    try {
      const stats = await fs.stat(filePath)
      if (stats.isDirectory()) {
        file = join(filePath, 'index.html')
      }
    } catch {
      file = join(distDir, 'index.html')
    }

    const data = await fs.readFile(file)
    const type = mimeTypes[extname(file)] || 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': type })
    res.end(data)
  } catch (error) {
    console.error(error)
    res.writeHead(500)
    res.end('Internal Server Error')
  }
})

const wss = new WebSocketServer({ noServer: true })

function broadcastState() {
  const snapshot = JSON.stringify({ type: 'STATE_SYNC', payload: serializeState(state) })
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(snapshot)
    }
  }
}

wss.on('connection', (socket) => {
  clients.add(socket)
  socket.send(JSON.stringify({ type: 'STATE_SYNC', payload: serializeState(state) }))

  socket.on('message', (raw) => {
    let message
    try {
      message = JSON.parse(raw.toString())
    } catch {
      socket.send(JSON.stringify({ type: 'ERROR', error: 'Ungueltige Nachricht' }))
      return
    }

    const { type, payload } = message || {}

    if (type === 'PING') {
      socket.send(JSON.stringify({ type: 'PONG' }))
      return
    }

    if (type === 'REQUEST_STATE') {
      socket.send(JSON.stringify({ type: 'STATE_SYNC', payload: serializeState(state) }))
      return
    }

    let result = null

    if (type === 'CLOCK_TICK') {
      if (!state.running) return

      const numeric = Number(payload)
      if (!Number.isFinite(numeric) || numeric <= 0) return

      const now = performance.now()
      const elapsed = lastTickTs != null ? now - lastTickTs : numeric
      const delta = Math.max(0, Math.min(numeric, elapsed))
      lastTickTs = now
      if (delta === 0) return

      result = applyAction(state, { type, payload: delta })
    } else {
      result = applyAction(state, { type, payload })
      if (result?.changed) {
        if (type === 'RUN') {
          lastTickTs = performance.now()
        } else if (
          type === 'STOP' ||
          type === 'RESET_CLOCK' ||
          type === 'SET_CLOCK'
        ) {
          lastTickTs = null
        }
      }
    }

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
  })

  socket.on('close', () => {
    clients.delete(socket)
  })
})

server.on('upgrade', (request, socket, head) => {
  try {
    const { pathname } = new URL(request.url || '/', `http://${request.headers.host}`)
    if (pathname === '/socket') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    } else {
      socket.destroy()
    }
  } catch (err) {
    console.error('Upgrade error', err)
    socket.destroy()
  }
})

server.listen(port, () => {
  console.log(`Controller on http://127.0.0.1:${port}/controller.html`)
})
