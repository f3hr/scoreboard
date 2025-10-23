import { state } from './useStore'
import { send } from './useSocket'

const isTopLevelWindow = typeof window !== 'undefined' && window === window.top

export function startClock() {
  if (!isTopLevelWindow) return

  let lastTime = null

  function tick(now) {
    if (state.running) {
      if (lastTime != null) {
        const delta = now - lastTime
        if (delta > 0) {
          send({ type: 'CLOCK_TICK', payload: delta })
        }
      }
      lastTime = now
    } else {
      lastTime = null
    }
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
