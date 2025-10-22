import { state } from './useStore'

const bc = new BroadcastChannel('scoreboard')

export function initBroadcast(){
  bc.onmessage = (e)=>{
    const { type, payload } = e.data || {}
    
    switch(type){
      case 'HOME+': state.home++; break
      case 'HOME-': state.home = Math.max(0, state.home-1); break
      case 'AWAY+': state.away++; break
      case 'AWAY-': state.away = Math.max(0, state.away-1); break
      case 'PERIOD': state.period = payload; break
      case 'RUN': state.running = true; break
      case 'STOP': state.running = false; break
      case 'SET_CLOCK': state.clockMs = payload|0; break
      case 'RESET': Object.assign(state, { home:0, away:0, period: "1", clockMs:20*60*1000, running:false, _lastT:null }); break
    }
  }
}

export function send(msg){
  bc.postMessage(msg)
}
