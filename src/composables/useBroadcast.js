import {
  state,
  addHomePenalty,
  removeHomePenaltyAt,
  syncHomePenalties,
  addAwayPenalty,
  removeAwayPenaltyAt,
  syncAwayPenalties,
} from './useStore'

const bc = new BroadcastChannel('scoreboard')
const MAX_CLOCK_MS = 20 * 60 * 1000

function broadcast(msg) { bc.postMessage(msg) }

function emitHomePenalties() {
  broadcast({ type: 'STATE_HOME_PENALTIES', payload: [...state.homePenalties] })
}

function emitAwayPenalties() {
  broadcast({ type: 'STATE_AWAY_PENALTIES', payload: [...state.awayPenalties] })
}

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
      
      case 'ADD_PENALTY_HOME': if (addHomePenalty(payload)) emitHomePenalties(); break
      case 'RM_PENALTY_HOME': if (removeHomePenaltyAt(payload)) emitHomePenalties(); break
      case 'REQUEST_HOME_PENALTIES': emitHomePenalties(); break
      case 'STATE_HOME_PENALTIES': syncHomePenalties(payload); break
      case 'ADD_PENALTY_AWAY': if (addAwayPenalty(payload)) emitAwayPenalties(); break
      case 'RM_PENALTY_AWAY': if (removeAwayPenaltyAt(payload)) emitAwayPenalties(); break
      case 'REQUEST_AWAY_PENALTIES': emitAwayPenalties(); break
      case 'STATE_AWAY_PENALTIES': syncAwayPenalties(payload); break
    }
  }
}

export function send(msg){ broadcast(msg) }
