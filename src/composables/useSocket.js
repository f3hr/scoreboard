import { assignState, applyAction, serializeState } from '../shared/scoreboard'
import { state } from './useStore'

const WS_ENDPOINT = '/socket'
const RECONNECT_DELAY_MS = 2000
const MAX_SOCKET_FAILURES = 5

let socket = null
let isOpen = false
let reconnectTimer = null
let failureCount = 0
const pendingMessages = []

let isFallback = false
let fallbackChannel = null
let fallbackId = null

function resolveSocketUrl() {
  const { protocol, host } = window.location
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
  return `${wsProtocol}//${host}${WS_ENDPOINT}`
}

function flushQueue() {
  if (!socket || !isOpen) return
  while (pendingMessages.length) {
    const message = pendingMessages.shift()
    try {
      socket.send(JSON.stringify(message))
    } catch (err) {
      console.error('WebSocket send failed', err)
      pendingMessages.unshift(message)
      socket.close()
      break
    }
  }
}

function scheduleReconnect() {
  if (isFallback) return
  if (reconnectTimer != null) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_DELAY_MS)
}

function broadcastFallbackState() {
  if (!fallbackChannel) return
  fallbackChannel.postMessage({
    sender: fallbackId,
    type: 'STATE_SYNC',
    payload: serializeState(state),
  })
}

function handleFallbackMessage(event) {
  const message = event.data
  if (!message || message.sender === fallbackId) return
  const { type, payload } = message

  if (type === 'STATE_SYNC') {
    assignState(state, payload)
    return
  }

  if (type === 'REQUEST_STATE') {
    broadcastFallbackState()
    return
  }

  if (type === 'ERROR') {
    if (typeof payload === 'string') window.alert?.(payload)
    return
  }

  const result = applyAction(state, { type, payload })
  if (result?.error) {
    fallbackChannel.postMessage({ sender: fallbackId, type: 'ERROR', payload: result.error })
    return
  }
  if (result?.changed) {
    broadcastFallbackState()
  }
}

function activateFallback() {
  if (isFallback) return
  console.warn('WebSocket nicht erreichbar, wechsle auf BroadcastChannel-Fallback.')
  isFallback = true
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close()
  }
  socket = null
  isOpen = false

  fallbackId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  fallbackChannel = new BroadcastChannel('scoreboard')
  fallbackChannel.onmessage = handleFallbackMessage

  const backlog = pendingMessages.splice(0)
  for (const msg of backlog) {
    handleFallbackSend(msg)
  }
  broadcastFallbackState()
}

function handleFallbackSend(message) {
  if (!isFallback) return
  const { type, payload } = message || {}
  if (type === 'REQUEST_STATE') {
    broadcastFallbackState()
    return
  }
  const result = applyAction(state, { type, payload })
  if (result?.error) {
    window.alert?.(result.error)
    fallbackChannel?.postMessage({ sender: fallbackId, type: 'ERROR', payload: result.error })
    return
  }
  if (result?.changed) {
    broadcastFallbackState()
  }
}

function handleMessage(event) {
  let data
  try {
    data = JSON.parse(event.data)
  } catch (err) {
    console.warn('Invalid message', event.data)
    return
  }

  const { type, payload, error } = data || {}

  switch (type) {
    case 'STATE_SYNC':
      assignState(state, payload)
      break
    case 'ERROR': {
      const message = typeof payload === 'string' ? payload : typeof error === 'string' ? error : null
      if (message) window.alert?.(message)
      break
    }
    case 'PONG':
      break
    default:
      console.warn('Unhandled message type', type)
  }
}

function connect() {
  if (isFallback) return
  if (socket) {
    socket.removeEventListener('open', onOpen)
    socket.removeEventListener('message', handleMessage)
    socket.removeEventListener('close', onClose)
    socket.removeEventListener('error', onError)
  }

  const url = resolveSocketUrl()
  try {
    socket = new WebSocket(url)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('message', handleMessage)
    socket.addEventListener('close', onClose)
    socket.addEventListener('error', onError)
  } catch (err) {
    console.error('WebSocket initialisation failed', err)
    failureCount += 1
    if (failureCount >= MAX_SOCKET_FAILURES) {
      activateFallback()
    } else {
      scheduleReconnect()
    }
  }
}

function onOpen() {
  isOpen = true
  failureCount = 0
  flushQueue()
  internalSend({ type: 'REQUEST_STATE' })
}

function onClose() {
  isOpen = false
  if (isFallback) return
  failureCount += 1
  if (failureCount >= MAX_SOCKET_FAILURES) {
    activateFallback()
    return
  }
  scheduleReconnect()
}

function onError(event) {
  console.error('WebSocket error', event)
  if (isFallback) return
  failureCount += 1
  if (socket?.readyState !== WebSocket.CLOSING && socket?.readyState !== WebSocket.CLOSED) {
    socket?.close()
  }
  if (failureCount >= MAX_SOCKET_FAILURES) {
    activateFallback()
  }
}

function internalSend(message) {
  if (isFallback) {
    handleFallbackSend(message)
    return
  }
  if (isOpen && socket?.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(message))
    } catch (err) {
      console.error('WebSocket send failed', err)
      pendingMessages.push(message)
      socket.close()
    }
  } else {
    pendingMessages.push(message)
  }
}

export function initSocket() {
  if (isFallback) {
    broadcastFallbackState()
    return
  }
  if (socket) return
  connect()
}

export function send(message) {
  internalSend(message)
}
