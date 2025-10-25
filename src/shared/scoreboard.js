/**
 * @typedef {Object} Penalty
 * @property {string} id
 * @property {string|number} player
 * @property {number} durationMs
 * @property {number} remainingMs
 */

/**
 * @typedef {Object} ScoreboardState
 * @property {string} gameTyp
 * @property {string} homeTeam
 * @property {number} home
 * @property {Penalty[]} homePenalties
 * @property {string} awayTeam
 * @property {number} away
 * @property {Penalty[]} awayPenalties
 * @property {string|number} period
 * @property {number} clockMs
 * @property {boolean} running
 * @property {string} opponentColor
 * @property {boolean} homeEmptyNetVisible
 * @property {boolean} awayEmptyNetVisible
 */

/**
 * @typedef {{ type: string, payload?: any }} ScoreboardAction
 */

export const DEFAULT_CLOCK_MS = 20 * 60 * 1000
export const MAX_CLOCK_MS = DEFAULT_CLOCK_MS
export const PENALTY_LIMIT = 3
export const DEFAULT_OPPONENT_COLOR = '#464646'

/**
 * @param {number|string} ms
 * @returns {string}
 */
export function formatMillis(ms) {
  const clamped = Math.max(0, Math.round(Number(ms) || 0))
  const minutes = Math.floor(clamped / 60000)
  const seconds = Math.floor((clamped % 60000) / 1000)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** @returns {ScoreboardState} */
export function createInitialState() {
  return {
    gameTyp: '',
    homeTeam: 'Red Devils Wernigerode',
    home: 0,
    homePenalties: [],
    awayTeam: '',
    away: 0,
    awayPenalties: [],
    period: 1,
    clockMs: DEFAULT_CLOCK_MS,
    running: false,
    opponentColor: DEFAULT_OPPONENT_COLOR,
    homeEmptyNetVisible: false,
    awayEmptyNetVisible: false,
  }
}

/**
 * @param {Penalty} penalty
 * @returns {Penalty}
 */
export function clonePenalty(penalty) {
  return {
    id: penalty.id,
    player: penalty.player,
    durationMs: penalty.durationMs,
    remainingMs: penalty.remainingMs,
  }
}

/**
 * @param {any} raw
 * @returns {Penalty|null}
 */
export function normalizePenalty(raw) {
  if (!raw || typeof raw !== 'object') return null
  const durationMs = Number(raw.durationMs)
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null
  const player = raw.player != null ? String(raw.player).trim() : ''
  if (!player) return null
  const id = raw.id != null ? String(raw.id) : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const remaining = Number(raw.remainingMs)
  const remainingMs = Number.isFinite(remaining) ? remaining : durationMs
  const safeRemaining = Math.max(Math.round(remainingMs), 0)
  const safeDuration = Math.max(Math.round(durationMs), safeRemaining)

  return {
    id,
    player,
    durationMs: safeDuration,
    remainingMs: safeRemaining,
  }
}

/**
 * @param {ScoreboardState} state
 * @returns {ScoreboardState}
 */
export function serializeState(state) {
  return {
    gameTyp: state.gameTyp,
    homeTeam: state.homeTeam,
    home: state.home,
    homePenalties: state.homePenalties.map(clonePenalty),
    awayTeam: state.awayTeam,
    away: state.away,
    awayPenalties: state.awayPenalties.map(clonePenalty),
    period: state.period,
    clockMs: state.clockMs,
    running: state.running,
    opponentColor: state.opponentColor,
    homeEmptyNetVisible: state.homeEmptyNetVisible,
    awayEmptyNetVisible: state.awayEmptyNetVisible,
  }
}

/**
 * @param {ScoreboardState} target
 * @param {Partial<ScoreboardState>} snapshot
 */
export function assignState(target, snapshot) {
  if (!snapshot) return
  target.gameTyp = snapshot.gameTyp ?? ''
  target.homeTeam = snapshot.homeTeam ?? ''
  target.home = Number(snapshot.home) || 0
  if (Array.isArray(target.homePenalties)) {
    target.homePenalties.splice(0, target.homePenalties.length, ...(snapshot.homePenalties || []).map(clonePenalty))
  } else {
    target.homePenalties = (snapshot.homePenalties || []).map(clonePenalty)
  }
  target.awayTeam = snapshot.awayTeam ?? ''
  target.away = Number(snapshot.away) || 0
  if (Array.isArray(target.awayPenalties)) {
    target.awayPenalties.splice(0, target.awayPenalties.length, ...(snapshot.awayPenalties || []).map(clonePenalty))
  } else {
    target.awayPenalties = (snapshot.awayPenalties || []).map(clonePenalty)
  }
  target.period = snapshot.period ?? 1
  target.clockMs = Number(snapshot.clockMs) || 0
  target.running = Boolean(snapshot.running)
  target.opponentColor = snapshot.opponentColor || DEFAULT_OPPONENT_COLOR
  target.homeEmptyNetVisible = Boolean(snapshot.homeEmptyNetVisible)
  target.awayEmptyNetVisible = Boolean(snapshot.awayEmptyNetVisible)
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function clampClock(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.round(numeric))
}

/**
 * @param {string} value
 * @returns {string|null}
 */
function sanitizeHexColor(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed.toLowerCase()
  }
  return null
}

/**
 * @param {Penalty[]} list
 * @param {number} deltaMs
 * @returns {boolean}
 */
function decreasePenalties(list, deltaMs) {
  if (!Array.isArray(list) || list.length === 0) return false
  let changed = false
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const entry = list[i]
    if (!entry) continue
    const nextRemaining = Math.max(0, entry.remainingMs - deltaMs)
    if (nextRemaining !== entry.remainingMs) {
      entry.remainingMs = nextRemaining
      changed = true
    }
    if (entry.remainingMs === 0) {
      list.splice(i, 1)
      changed = true
    }
  }
  return changed
}

/**
 * @param {ScoreboardState} state
 * @param {number} deltaMs
 * @returns {{changed: boolean, error?: string}}
 */
export function applyClockTick(state, deltaMs) {
  const delta = Number(deltaMs)
  if (!Number.isFinite(delta) || delta <= 0) return { changed: false }
  if (!state.running) return { changed: false }

  const nextClock = Math.max(0, state.clockMs - delta)
  let changed = nextClock !== state.clockMs
  state.clockMs = nextClock

  const homeChanged = decreasePenalties(state.homePenalties, delta)
  const awayChanged = decreasePenalties(state.awayPenalties, delta)
  changed = changed || homeChanged || awayChanged

  if (state.clockMs === 0 && state.running) {
    state.running = false
    changed = true
  }

  return { changed }
}

/**
 * @param {ScoreboardState} state
 * @param {ScoreboardAction} action
 * @returns {{changed: boolean, error?: string}}
 */
export function applyAction(state, action) {
  if (!state || !action) return { changed: false }
  const { type, payload } = action
  let changed = false

  switch (type) {
    case 'SET_GAME-TYP': {
      const next = payload != null ? String(payload) : ''
      if (state.gameTyp !== next) {
        state.gameTyp = next
        changed = true
      }
      break
    }
    case 'SET_HOME-TEAM': {
      const next = payload != null ? String(payload) : ''
      if (state.homeTeam !== next) {
        state.homeTeam = next
        changed = true
      }
      break
    }
    case 'SET_AWAY-TEAM': {
      const next = payload != null ? String(payload) : ''
      if (state.awayTeam !== next) {
        state.awayTeam = next
        changed = true
      }
      break
    }
    case 'HOME+':
      state.home += 1
      changed = true
      break
    case 'HOME-': {
      const next = Math.max(0, state.home - 1)
      if (state.home !== next) {
        state.home = next
        changed = true
      }
      break
    }
    case 'AWAY+':
      state.away += 1
      changed = true
      break
    case 'AWAY-': {
      const next = Math.max(0, state.away - 1)
      if (state.away !== next) {
        state.away = next
        changed = true
      }
      break
    }
    case 'PERIOD': {
      const next = payload != null ? String(payload) : ''
      if (state.period !== next) {
        state.period = next
        changed = true
      }
      break
    }
    case 'RUN':
      if (!state.running) {
        state.running = true
        changed = true
      }
      break
    case 'STOP':
      if (state.running) {
        state.running = false
        changed = true
      }
      break
    case 'SET_CLOCK': {
      const next = clampClock(payload)
      if (state.clockMs !== next) {
        state.clockMs = next
        changed = true
      }
      break
    }
    case 'RESET_CLOCK':
      if (state.clockMs !== DEFAULT_CLOCK_MS || state.running) {
        state.clockMs = DEFAULT_CLOCK_MS
        state.running = false
        changed = true
      }
      break
    case 'RM_SEC': {
      const next = Math.max(0, state.clockMs - 1000)
      if (state.clockMs !== next) {
        state.clockMs = next
        changed = true
      }
      break
    }
    case 'ADD_SEC': {
      const next = Math.min(MAX_CLOCK_MS, state.clockMs + 1000)
      if (state.clockMs !== next) {
        state.clockMs = next
        changed = true
      }
      break
    }
    case 'RM_5-SEC': {
      const next = Math.max(0, state.clockMs - 5000)
      if (state.clockMs !== next) {
        state.clockMs = next
        changed = true
      }
      break
    }
    case 'ADD_5-SEC': {
      const next = Math.min(MAX_CLOCK_MS, state.clockMs + 5000)
      if (state.clockMs !== next) {
        state.clockMs = next
        changed = true
      }
      break
    }
    case 'ADD_PENALTY_HOME': {
      const entry = normalizePenalty(payload)
      if (!entry) return { changed: false, error: 'Ungültige Strafe' }
      if (!Array.isArray(state.homePenalties)) state.homePenalties = []
      if (state.homePenalties.length >= PENALTY_LIMIT) {
        return { changed: false, error: 'Es dürfen maximal 3 Strafzeiten vergeben werden.' }
      }
      state.homePenalties.push(entry)
      changed = true
      break
    }
    case 'ADD_PENALTY_AWAY': {
      const entry = normalizePenalty(payload)
      if (!entry) return { changed: false, error: 'Ungültige Strafe' }
      if (!Array.isArray(state.awayPenalties)) state.awayPenalties = []
      if (state.awayPenalties.length >= PENALTY_LIMIT) {
        return { changed: false, error: 'Es dürfen maximal 3 Strafzeiten vergeben werden.' }
      }
      state.awayPenalties.push(entry)
      changed = true
      break
    }
    case 'RM_PENALTY_HOME': {
      const idx = Number(payload)
      if (!Number.isInteger(idx)) return { changed: false }
      if (!Array.isArray(state.homePenalties)) return { changed: false }
      if (idx < 0 || idx >= state.homePenalties.length) return { changed: false }
      state.homePenalties.splice(idx, 1)
      changed = true
      break
    }
    case 'RM_PENALTY_AWAY': {
      const idx = Number(payload)
      if (!Number.isInteger(idx)) return { changed: false }
      if (!Array.isArray(state.awayPenalties)) return { changed: false }
      if (idx < 0 || idx >= state.awayPenalties.length) return { changed: false }
      state.awayPenalties.splice(idx, 1)
      changed = true
      break
    }
    case 'ADJUST_PENALTY_HOME': {
      const index = Number(payload?.index)
      const deltaMs = Number(payload?.deltaMs)
      if (!Number.isInteger(index) || !Number.isFinite(deltaMs) || deltaMs === 0) return { changed: false }
      const entry = state.homePenalties?.[index]
      if (!entry) return { changed: false }
      const next = Math.max(0, entry.remainingMs + deltaMs)
      if (next === entry.remainingMs) return { changed: false }
      entry.remainingMs = next
      if (entry.durationMs < next) entry.durationMs = next
      changed = true
      break
    }
    case 'ADJUST_PENALTY_AWAY': {
      const index = Number(payload?.index)
      const deltaMs = Number(payload?.deltaMs)
      if (!Number.isInteger(index) || !Number.isFinite(deltaMs) || deltaMs === 0) return { changed: false }
      const entry = state.awayPenalties?.[index]
      if (!entry) return { changed: false }
      const next = Math.max(0, entry.remainingMs + deltaMs)
      if (next === entry.remainingMs) return { changed: false }
      entry.remainingMs = next
      if (entry.durationMs < next) entry.durationMs = next
      changed = true
      break
    }
    case 'CLOCK_TICK':
      return applyClockTick(state, payload)
    case 'SET_OPPONENT_COLOR': {
      const next = sanitizeHexColor(payload)
      if (!next || state.opponentColor === next) return { changed: false }
      state.opponentColor = next
      changed = true
      break
    }
    case 'SET_HOME_EMPTY_NET': {
      const next = Boolean(payload)
      if (state.homeEmptyNetVisible === next) return { changed: false }
      state.homeEmptyNetVisible = next
      changed = true
      break
    }
    case 'SET_AWAY_EMPTY_NET': {
      const next = Boolean(payload)
      if (state.awayEmptyNetVisible === next) return { changed: false }
      state.awayEmptyNetVisible = next
      changed = true
      break
    }
    default:
      return { changed: false }
  }

  return { changed }
}
