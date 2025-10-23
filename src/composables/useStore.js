import { reactive, computed } from 'vue'

export const state = reactive({
  gameTyp: "",
  home: 0,
  homePenalties: [],
  away: 0,
  awayPenalties: [], 
  period: 1,
  clockMs: 20 * 60 * 1000, // 20:00
  running: false,
  _lastT: null
})

export const clockText = computed(() => {
  const ms = Math.max(0, state.clockMs)
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
})


// Penalty-Logik
const PENALTY_LIMIT = 3

function addPenaltyTo(key, p) {
  const list = state[key]
  if (list.length >= PENALTY_LIMIT) {
    alert("Es dürfen maximal 3 Penalities vergeben werden.");
    return;
  }
  list.push(p);
  return true;
}

function removePenaltyAtIndex(key, idx) {
  const list = state[key]
  if (idx < 0 || idx >= list.length) return false;
  list.splice(idx, 1);
  return true;
}

function syncPenalties(key, list) {
  state[key] = Array.isArray(list) ? [...list] : [];
}

export const addHomePenalty = (p) => addPenaltyTo('homePenalties', p)
export const removeHomePenaltyAt = (idx) => removePenaltyAtIndex('homePenalties', idx)
export const syncHomePenalties = (list) => syncPenalties('homePenalties', list)

export const addAwayPenalty = (p) => addPenaltyTo('awayPenalties', p)
export const removeAwayPenaltyAt = (idx) => removePenaltyAtIndex('awayPenalties', idx)
export const syncAwayPenalties = (list) => syncPenalties('awayPenalties', list)

