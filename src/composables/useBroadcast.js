import { state } from './useStore'

const bc = new BroadcastChannel('scoreboard')
const MAX_CLOCK_MS = 20 * 60 * 1000

export function initBroadcast(){
  bc.onmessage = (e)=> {
    const { type, payload } = e.data || {}
    
    switch(type) {
      case 'SET_GAME-TYP': state.gameTyp = "" + payload; break
      case 'HOME+': state.home++; break
      case 'HOME-': state.home = Math.max(0, state.home-1); break
      case 'AWAY+': state.away++; break
      case 'AWAY-': state.away = Math.max(0, state.away-1); break
      case 'PERIOD': state.period = payload; break
      case 'RUN': state.running = true; break
      case 'STOP': state.running = false; break
      case 'RM_SEC': state.clockMs -= 1000; break
      case 'ADD_SEC': state.clockMs = state.clockMs + 1000 >= MAX_CLOCK_MS ? MAX_CLOCK_MS : state.clockMs + 1000;; break
      case 'RM_5-SEC': state.clockMs -= 5000; break
      case 'ADD_5-SEC': state.clockMs = state.clockMs + 5000 >= MAX_CLOCK_MS ? MAX_CLOCK_MS : state.clockMs + 5000; break
      case 'SET_CLOCK': state.clockMs = payload | 0; break
      case 'RESET_CLOCK': Object.assign(state, {clockMs: 20*60*1000, running: false, _lastT: null }); break
    }
  }
}

export function send(msg){
  bc.postMessage(msg)
}
