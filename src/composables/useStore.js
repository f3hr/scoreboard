import { reactive, computed } from 'vue'

const DEFAULT_CLOCK_MS = 20 * 60 * 1000

function formatMillis(ms) {
  const clamped = Math.max(0, Math.round(ms))
  const m = Math.floor(clamped / 60000)
  const s = Math.floor((clamped % 60000) / 1000)
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export const state = reactive({
  gameTyp: "",
  homeTeam: "Red Devils Wernigerode",
  home: 0,
  homePenalties: [],
  awayTeam: "",
  away: 0,
  awayPenalties: [], 
  period: 1,
  clockMs: DEFAULT_CLOCK_MS,
  running: false,
  _lastT: null,
})

export const clockText = computed(() => formatMillis(state.clockMs))

// Penalty logic
const PENALTY_LIMIT = 3
let syncSeed = 0

function normalizePenalty(raw) {
  if (!raw || typeof raw !== 'object') return null
  const durationMs = Number(raw.durationMs)
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null
  const id = raw.id ? String(raw.id) : `sync-${Date.now()}-${syncSeed++}`
  const playerNumber = raw.player != null ? String(raw.player).trim() : ''
  if (!playerNumber) return null
  const remaining = Number(raw.remainingMs)
  const remainingMs = Number.isFinite(remaining) ? remaining : durationMs
  const safeRemaining = Math.max(Math.round(remainingMs), 0)
  const safeDuration = Math.max(Math.round(durationMs), safeRemaining)
  return {
    id,
    player: playerNumber,
    durationMs: safeDuration,
    remainingMs: safeRemaining,
  }
}

function clonePenalty(p) {
  return {
    id: p.id,
    player: p.player,
    durationMs: p.durationMs,
    remainingMs: p.remainingMs,
  }
}

function addPenaltyTo(key, raw) {
  const list = state[key]
  if (list.length >= PENALTY_LIMIT) {
    alert("Es duerfen maximal 3 Penalities vergeben werden.");
    return false;
  }
  const entry = normalizePenalty(raw)
  if (!entry) return false
  list.push(entry)
  return true
}

function removePenaltyAtIndex(key, idx) {
  const list = state[key]
  if (idx < 0 || idx >= list.length) return false
  list.splice(idx, 1)
  return true
}

function adjustPenaltyAt(key, idx, deltaMs) {
  const list = state[key]
  const entry = list[idx]
  if (!entry) return false
  const delta = Math.round(Number(deltaMs))
  if (!Number.isFinite(delta) || delta === 0) return false
  const next = Math.max(0, entry.remainingMs + delta)
  if (next === entry.remainingMs) return false
  entry.remainingMs = next
  if (entry.durationMs < next) entry.durationMs = next
  return true
}

function syncPenalties(key, list) {
  if (!Array.isArray(list)) {
    state[key] = []
    return
  }
  const sanitized = list
    .map((item) => normalizePenalty(item))
    .filter(Boolean)
    .map(clonePenalty)
  state[key] = sanitized
}

export const addHomePenalty = (p) => addPenaltyTo('homePenalties', p)
export const removeHomePenaltyAt = (idx) => removePenaltyAtIndex('homePenalties', idx)
export const adjustHomePenaltyAt = (idx, deltaMs) => adjustPenaltyAt('homePenalties', idx, deltaMs)
export const syncHomePenalties = (list) => syncPenalties('homePenalties', list)

export const addAwayPenalty = (p) => addPenaltyTo('awayPenalties', p)
export const removeAwayPenaltyAt = (idx) => removePenaltyAtIndex('awayPenalties', idx)
export const adjustAwayPenaltyAt = (idx, deltaMs) => adjustPenaltyAt('awayPenalties', idx, deltaMs)
export const syncAwayPenalties = (list) => syncPenalties('awayPenalties', list)

export const formatPenaltyTime = formatMillis
export const formatPenaltyLabel = (p) => `${p.player} ${formatMillis(p.remainingMs)}`
