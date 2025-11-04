import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyAction,
  applyClockTick,
  assignState,
  createInitialState,
  DEFAULT_OPPONENT_COLOR,
  formatMillis,
  MAX_CLOCK_MS,
  normalizePenalty,
  PENALTY_LIMIT,
  serializeState,
} from '../src/shared/scoreboard.js'

let state

beforeEach(() => {
  state = createInitialState()
  state.homePenalties = []
  state.awayPenalties = []
})

describe('applyAction', () => {
  it('increments and decrements scores safely', () => {
    expect(applyAction(state, { type: 'HOME+' }).changed).toBe(true)
    expect(state.home).toBe(1)

    expect(applyAction(state, { type: 'HOME-' }).changed).toBe(true)
    expect(state.home).toBe(0)

    expect(applyAction(state, { type: 'AWAY-' }).changed).toBe(false)
    expect(state.away).toBe(0)
  })

  it('enforces penalty limits', () => {
    const penalty = (idx) => ({
      id: `p-${idx}`,
      player: idx + 1,
      durationMs: 120000,
      remainingMs: 120000,
    })

    for (let i = 0; i < PENALTY_LIMIT; i += 1) {
      const result = applyAction(state, { type: 'ADD_PENALTY_HOME', payload: penalty(i) })
      expect(result.changed).toBe(true)
    }

    const overflow = applyAction(state, { type: 'ADD_PENALTY_HOME', payload: penalty(3) })
    expect(overflow.changed).toBe(false)
    expect(overflow.error).toBeTruthy()
    expect(state.homePenalties).toHaveLength(PENALTY_LIMIT)
  })

  it('ticks the clock down to zero and auto-stops', () => {
    state.clockMs = 1500
    applyAction(state, { type: 'RUN' })

    const result = applyAction(state, { type: 'CLOCK_TICK', payload: 2000 })
    expect(result.changed).toBe(true)
    expect(state.clockMs).toBe(0)
    expect(state.running).toBe(false)
  })

  it('supports toggling clock direction to count up', () => {
    applyAction(state, { type: 'SET_CLOCK', payload: 0 })
    const toggle = applyAction(state, { type: 'SET_CLOCK_DIRECTION', payload: false })
    expect(toggle.changed).toBe(true)
    expect(state.clockCountsDown).toBe(false)

    applyAction(state, { type: 'RUN' })
    applyAction(state, { type: 'CLOCK_TICK', payload: 1000 })
    expect(state.clockMs).toBe(1000)
    expect(state.running).toBe(true)

    applyAction(state, { type: 'CLOCK_TICK', payload: MAX_CLOCK_MS })
    expect(state.clockMs).toBe(MAX_CLOCK_MS)
    expect(state.running).toBe(false)

    const back = applyAction(state, { type: 'SET_CLOCK_DIRECTION', payload: true })
    expect(back.changed).toBe(true)
    expect(state.clockCountsDown).toBe(true)
  })

  it('updates opponent color only for valid hex values', () => {
    expect(state.opponentColor).toBe(DEFAULT_OPPONENT_COLOR)
    const valid = applyAction(state, { type: 'SET_OPPONENT_COLOR', payload: '#abcdef' })
    expect(valid.changed).toBe(true)
    expect(state.opponentColor).toBe('#abcdef')

    const invalid = applyAction(state, { type: 'SET_OPPONENT_COLOR', payload: 'blue' })
    expect(invalid.changed).toBe(false)
    expect(state.opponentColor).toBe('#abcdef')

    const noop = applyAction(state, { type: 'SET_OPPONENT_COLOR', payload: '#abcdef' })
    expect(noop.changed).toBe(false)

    applyAction(state, { type: 'SET_OPPONENT_COLOR', payload: null })
    expect(state.opponentColor).toBe('#abcdef')

    applyAction(state, { type: 'SET_OPPONENT_COLOR', payload: '#123456' })
    expect(state.opponentColor).toBe('#123456')

    applyAction(state, { type: 'SET_OPPONENT_COLOR', payload: '#123' })
    expect(state.opponentColor).toBe('#123')

    applyAction(state, { type: 'SET_OPPONENT_COLOR', payload: ' #fff ' })
    expect(state.opponentColor).toBe('#fff')
  })

  it('toggles empty net flags via dedicated actions', () => {
    expect(state.homeEmptyNetVisible).toBe(false)
    expect(state.awayEmptyNetVisible).toBe(false)

    const homeToggle = applyAction(state, { type: 'SET_HOME_EMPTY_NET', payload: true })
    expect(homeToggle.changed).toBe(true)
    expect(state.homeEmptyNetVisible).toBe(true)

    const homeNoop = applyAction(state, { type: 'SET_HOME_EMPTY_NET', payload: true })
    expect(homeNoop.changed).toBe(false)

    const awayToggle = applyAction(state, { type: 'SET_AWAY_EMPTY_NET', payload: 1 })
    expect(awayToggle.changed).toBe(true)
    expect(state.awayEmptyNetVisible).toBe(true)

    const awayOff = applyAction(state, { type: 'SET_AWAY_EMPTY_NET', payload: 0 })
    expect(awayOff.changed).toBe(true)
    expect(state.awayEmptyNetVisible).toBe(false)
  })
})

describe('Funktionstests', () => {
  it('simulates a full game script with penalties and precise clock control', () => {
    const gameState = createInitialState()
    const scriptedActions = [
      { type: 'SET_HOME-TEAM', payload: 'Devils' },
      { type: 'SET_AWAY-TEAM', payload: 'Bulls' },
      { type: 'PERIOD', payload: 2 },
      { type: 'HOME+' },
      { type: 'HOME+' },
      { type: 'HOME-' },
      { type: 'AWAY+' },
      { type: 'AWAY-' },
    ]

    scriptedActions.forEach((action) => {
      expect(applyAction(gameState, action).changed).toBe(true)
    })

    expect(applyAction(gameState, { type: 'AWAY-' }).changed).toBe(false)
    expect(applyAction(gameState, { type: 'SET_CLOCK', payload: 60000 }).changed).toBe(true)

    const homePenalty = { id: 'h1', player: '47', durationMs: 120000, remainingMs: 120000 }
    const awayPenalty = { id: 'a1', player: '17', durationMs: 60000, remainingMs: 30000 }
    expect(applyAction(gameState, { type: 'ADD_PENALTY_HOME', payload: homePenalty }).changed).toBe(true)
    expect(applyAction(gameState, { type: 'ADD_PENALTY_AWAY', payload: awayPenalty }).changed).toBe(true)

    expect(applyAction(gameState, { type: 'RUN' }).changed).toBe(true)

    const firstTick = applyAction(gameState, { type: 'CLOCK_TICK', payload: 20000 })
    expect(firstTick.changed).toBe(true)
    expect(gameState.clockMs).toBe(40000)
    expect(gameState.homePenalties[0].remainingMs).toBe(100000)
    expect(gameState.awayPenalties[0].remainingMs).toBe(10000)

    const secondTick = applyAction(gameState, { type: 'CLOCK_TICK', payload: 10000 })
    expect(secondTick.changed).toBe(true)
    expect(gameState.clockMs).toBe(30000)
    expect(gameState.awayPenalties).toHaveLength(0)

    const finalTick = applyAction(gameState, { type: 'CLOCK_TICK', payload: 40000 })
    expect(finalTick.changed).toBe(true)
    expect(gameState.clockMs).toBe(0)
    expect(gameState.running).toBe(false)
    expect(gameState.homePenalties[0].remainingMs).toBe(50000)

    expect(gameState.homeTeam).toBe('Devils')
    expect(gameState.awayTeam).toBe('Bulls')
    expect(gameState.home).toBe(1)
    expect(gameState.away).toBe(0)
    expect(gameState.period).toBe('2')
  })
})

describe('Usability-Tests', () => {
  it('normalizes messy user input and keeps the UI-friendly time formatting stable', () => {
    const normalized = normalizePenalty({
      id: 'user-form',
      player: ' 07 ',
      durationMs: '90000.7',
      remainingMs: ' 45000.2 ',
    })

    expect(normalized).not.toBeNull()
    expect(normalized?.player).toBe('07')
    expect(normalized?.durationMs).toBe(90001)
    expect(normalized?.remainingMs).toBe(45000)
    expect(normalized?.durationMs).toBeGreaterThanOrEqual(normalized?.remainingMs ?? 0)

    expect(normalizePenalty({ player: ' ', durationMs: 1000 })).toBeNull()
    expect(normalizePenalty({ player: '9', durationMs: -100 })).toBeNull()
    expect(normalizePenalty({ player: '9', durationMs: 'abc' })).toBeNull()

    expect(formatMillis('61000.4')).toBe('01:01')
    expect(formatMillis(0)).toBe('00:00')
    expect(formatMillis(-15)).toBe('00:00')
  })
})

describe('Schnittstellentests', () => {
  it('round-trips serialized snapshots without leaking references between layers', () => {
    const source = createInitialState()
    applyAction(source, { type: 'SET_HOME-TEAM', payload: 'Origin' })
    applyAction(source, { type: 'SET_AWAY-TEAM', payload: 'Replica' })
    source.home = 5
    source.away = 2
    source.period = 'OT'
    source.homePenalties.push(
      normalizePenalty({ id: 'H-1', player: '91', durationMs: 120000, remainingMs: 90000 }),
    )
    source.awayPenalties.push(
      normalizePenalty({ id: 'A-1', player: '16', durationMs: 60000, remainingMs: 60000 }),
    )

    const snapshot = serializeState(source)

    const target = createInitialState()
    target.homePenalties.push(
      normalizePenalty({ id: 'temp', player: 'old', durationMs: 5000, remainingMs: 5000 }),
    )
    assignState(target, snapshot)

    expect(target.homeTeam).toBe('Origin')
    expect(target.awayTeam).toBe('Replica')
    expect(target.home).toBe(5)
    expect(target.away).toBe(2)
    expect(target.period).toBe('OT')
    expect(target.homePenalties).toHaveLength(1)
    expect(target.homePenalties[0]).toMatchObject({ player: '91', remainingMs: 90000 })
    expect(target.awayPenalties[0]).toMatchObject({ player: '16', remainingMs: 60000 })

    target.homePenalties[0].remainingMs = 1
    expect(source.homePenalties[0].remainingMs).toBe(90000)
    expect(snapshot.homePenalties[0].remainingMs).toBe(90000)
  })
})

describe('Kompatibilitätstests', () => {
  it('accepts heterogeneous controller payloads and keeps conversions consistent', () => {
    const target = createInitialState()
    assignState(target, {
      homeTeam: 'Devils',
      awayTeam: 'Bulls',
      home: '4',
      away: '2',
      period: 'OT',
      clockMs: '45000',
      running: 1,
      opponentColor: '#abcdef',
      homeEmptyNetVisible: '1',
      awayEmptyNetVisible: 0,
      clockCountsDown: 0,
      homePenalties: [
        { id: 'remote-home', player: 11, durationMs: 20000, remainingMs: 15000 },
      ],
      awayPenalties: [
        { id: 'remote-away', player: '15', durationMs: 20000, remainingMs: 5000 },
      ],
    })

    expect(target.homeTeam).toBe('Devils')
    expect(target.awayTeam).toBe('Bulls')
    expect(target.home).toBe(4)
    expect(target.away).toBe(2)
    expect(target.clockMs).toBe(45000)
    expect(target.running).toBe(true)
    expect(target.clockCountsDown).toBe(false)
    expect(target.homeEmptyNetVisible).toBe(true)
    expect(target.awayEmptyNetVisible).toBe(false)
    expect(target.homePenalties[0]).toMatchObject({ player: 11, remainingMs: 15000 })
    expect(target.awayPenalties[0]).toMatchObject({ player: '15', remainingMs: 5000 })

    const clockResult = applyAction(target, { type: 'SET_CLOCK', payload: '90000' })
    expect(clockResult.changed).toBe(true)
    expect(target.clockMs).toBe(90000)
  })
})

describe('Leistungstests', () => {
  it('handles high-frequency rAF-style updates under heavy penalty load', () => {
    const stressState = createInitialState()
    stressState.clockMs = 10000
    stressState.running = true
    stressState.homePenalties = Array.from({ length: 150 }, (_, idx) => ({
      id: `h-${idx}`,
      player: idx + 1,
      durationMs: 2000,
      remainingMs: 2000,
    }))
    stressState.awayPenalties = Array.from({ length: 150 }, (_, idx) => ({
      id: `a-${idx}`,
      player: idx + 1,
      durationMs: 2000,
      remainingMs: 2000,
    }))

    const heavyTick = applyClockTick(stressState, 2000)
    expect(heavyTick.changed).toBe(true)
    expect(stressState.homePenalties).toHaveLength(0)
    expect(stressState.awayPenalties).toHaveLength(0)
    expect(stressState.clockMs).toBe(8000)

    let frames = 0
    while (stressState.running && frames < 1000) {
      frames += 1
      const frameResult = applyClockTick(stressState, 16)
      expect(frameResult.changed).toBe(true)
    }

    expect(frames).toBe(500)
    expect(stressState.clockMs).toBe(0)
    expect(stressState.running).toBe(false)
  })
})
