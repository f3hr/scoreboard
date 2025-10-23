import { state } from './useStore'
import { emitHomePenalties, emitAwayPenalties } from './useBroadcast'

function decreasePenalties(list, dt) {
  let changed = false
  for (let i = list.length - 1; i >= 0; i--) {
    const entry = list[i]
    if (entry.remainingMs <= dt) {
      list.splice(i, 1)
      changed = true
      continue
    }
    const nextValue = entry.remainingMs - dt
    if (nextValue !== entry.remainingMs) {
      entry.remainingMs = nextValue
      changed = true
    }
  }
  return changed
}

function stepPenalties(dt) {
  const homeChanged = decreasePenalties(state.homePenalties, dt)
  const awayChanged = decreasePenalties(state.awayPenalties, dt)

  if (homeChanged) emitHomePenalties()
  if (awayChanged) emitAwayPenalties()
}

export function startClock(){
  function tick(t){
    if (state.running){
      if (state._lastT == null) state._lastT = t
      const dt = t - state._lastT
      if (dt > 0) {
        state.clockMs = Math.max(0, state.clockMs - dt)
        stepPenalties(dt)
      }
      state._lastT = t
    } else {
      state._lastT = null
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
