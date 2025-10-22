import { state } from './useStore'

export function startClock(){
  function tick(t){
    if (state.running){
      if (state._lastT == null) state._lastT = t
      const dt = t - state._lastT
      state.clockMs -= dt
      state._lastT = t
    } else {
      state._lastT = null
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
