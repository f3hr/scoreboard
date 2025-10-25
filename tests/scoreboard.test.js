import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialState,
  applyAction,
  PENALTY_LIMIT,
  DEFAULT_OPPONENT_COLOR,
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
})
