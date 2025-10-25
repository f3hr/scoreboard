<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { send, initSocket } from './composables/useSocket'
import { state, formatPenaltyTime } from './composables/useStore'
import { DEFAULT_OPPONENT_COLOR } from './shared/scoreboard'

const mm = ref(20)
const ss = ref(0)

const selected = ref(state.gameTyp)
const period = ref(state.period)
const homeTeamName = ref(state.homeTeam)
const awayTeamName = ref(state.awayTeam)
const opponentColor = ref(state.opponentColor || DEFAULT_OPPONENT_COLOR)

const nrHome = ref('')
const timeHome = ref(2)
const nrAway = ref('')
const timeAway = ref(2)

watch(() => state.gameTyp, (val) => { selected.value = val })
watch(() => state.period, (val) => { period.value = val })
watch(() => state.homeTeam, (val) => { homeTeamName.value = val })
watch(() => state.awayTeam, (val) => { awayTeamName.value = val })
watch(() => state.opponentColor, (val) => { opponentColor.value = val || DEFAULT_OPPONENT_COLOR })

function setClock(){
  const ms = (Number(mm.value)*60 + Number(ss.value)) * 1000
  send({ type: 'SET_CLOCK', payload: ms })
}


let penaltySeed = 0

function createPenaltyPayload(playerRef, minutesRef) {
  const playerNr = Number.parseInt(playerRef.value, 10)
  const minutes = Number(minutesRef.value)
  
  if (Number.isNaN(playerNr) || Number.isNaN(minutes) || minutes <= 0) return null
  
  const durationMs = Math.round(minutes * 60 * 1000)
  
  const entry = {
    id: `${Date.now()}-${penaltySeed++}`, // basically UID
    player: playerNr,
    durationMs,
    remainingMs: durationMs,
  }

  return entry
}

function addHomePenalty() {
  const payload = createPenaltyPayload(nrHome, timeHome)
  if (!payload) return
  send({ type: 'ADD_PENALTY_HOME', payload })
}

function addAwayPenalty() {
  const payload = createPenaltyPayload(nrAway, timeAway)
  if (!payload) return
  send({ type: 'ADD_PENALTY_AWAY', payload })
}

function adjustHomePenalty(idx, deltaSeconds) {
  send({ type: 'ADJUST_PENALTY_HOME', payload: { index: idx, deltaMs: deltaSeconds * 1000 } })
}

function adjustAwayPenalty(idx, deltaSeconds) {
  send({ type: 'ADJUST_PENALTY_AWAY', payload: { index: idx, deltaMs: deltaSeconds * 1000 } })
}

function onOpponentColorInput(value) {
  const next = typeof value === 'string' ? value : opponentColor.value
  if (!next) return
  opponentColor.value = next
  send({ type: 'SET_OPPONENT_COLOR', payload: next })
}

const keymap = {
  ArrowLeft:  { type: 'RM_SEC' },
  ArrowRight: { type: 'ADD_SEC' },
  ArrowDown:  { type: 'RM_5-SEC' },
  ArrowUp:    { type: 'ADD_5-SEC' },
  'ä':        { type: 'RUN' },
  'ö':        { type: 'STOP' },
}

const beforeUnloadHandler = (e) => {
  e.preventDefault()
  e.returnValue = ''
}

function onKey(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const todo = keymap[k]
  if (!todo) return
  if (k.startsWith('Arrow')) e.preventDefault()
  if (e.repeat) return
  send(todo)
}

onMounted(() => {
  initSocket()
  
  window.addEventListener('keydown', onKey, {passive: false});
  window.addEventListener('beforeunload', beforeUnloadHandler);
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})

</script>

<template>
  <main>
    
    <div>

      <iframe src="../index.html" style="width: 150%;"></iframe>

      <div style="display: flex; gap: 0.5rem; width: 150%;">
        <p>"ö" Uhr stoppen</p>
        <p>"ä" Uhr fortsetzen</p>
        <p>"ArrowLeft" -1s</p>
        <p>"ArrowRight" +1s</p>
        <p>"ArrowUp" +5s</p>
        <p>"ArrowDown" -5s</p>
      </div>
    </div>
    
    <section>
      <select v-model="selected" @change="send({ type: 'SET_GAME-TYP', payload: selected})">
        <option disabled value="">auswählen</option>
        <option value="dfbl.svg" >1. FBL Damen</option>
        <option value="fbl.svg">2. FBL Herren</option>
        <option value="pokal.svg">FD Pokal</option>
      </select>
    </section>

    <section>
      <label>Home Team </label>
      <input v-model="homeTeamName" type="text" style="width: 12rem;">
      <button @click="send({type: 'SET_HOME-TEAM', payload: homeTeamName})">Set</button>
    </section>

    <section>
      <label>Away Team </label>
      <input v-model="awayTeamName" type="text" style="width: 12rem;">
      <button @click="send({type: 'SET_AWAY-TEAM', payload: awayTeamName})">Set</button> 
      <input 
        id="opponent-color" type="color" :value="opponentColor"
        @input="onOpponentColorInput($event.target.value)"
      >
    </section>

    <section>
      <button @click="send({type:'HOME+'})">Home+</button>
      <button @click="send({type:'HOME-'})">Home-</button>
      <button @click="send({type:'AWAY+'})">Away+</button>
      <button @click="send({type:'AWAY-'})">Away-</button>
    </section>

    <section>
      <label>P: </label>
      <input v-model="period" type="text">
      <button @click="send({type:'PERIOD', payload: period})">Set</button>
    </section>

    <section>
      <label>Zeit mm:ss </label>
      <input v-model="mm" type="number" min="0">
      <span>:</span>
      <input v-model="ss" type="number" min="0" max="59">
      <button @click="setClock">Set</button>
      <button @click="send({type:'RESET_CLOCK'})">Reset</button>
    </section>

    <section>
      <span>Penalty Home Team </span>
      <label><input v-model="nrHome" type="number" min="1" max="99"></label>
      <label><input v-model="timeHome" type="number" min="2" max="10"></label>
      <button @click="addHomePenalty">Set</button>
    </section>

    <section>
      <div class="penaltyBoxes">
        <p v-for="(item,j) in state.homePenalties" :key="item.id">
          {{ item.player }} {{ formatPenaltyTime(item.remainingMs) }}
          <button type="button" @click="adjustHomePenalty(j, -1)">-1s</button>
          <button type="button" @click="adjustHomePenalty(j, 1)">+1s</button>
          <button type="button" @click="send({ type: 'RM_PENALTY_HOME', payload: j })">X</button>
        </p>
      </div>
    </section>

    <section>
      <span>Penalty Away Team </span>
      <label><input v-model="nrAway" type="number" min="1" max="99"></label>
      <label><input v-model="timeAway" type="number" min="2" max="10"></label>
      <button @click="addAwayPenalty">Set</button>
    </section>

    <section>
      <div class="penaltyBoxes">
        <p v-for="(item,k) in state.awayPenalties" :key="item.id">
          {{ item.player }} {{ formatPenaltyTime(item.remainingMs) }}
          <button type="button" @click="adjustAwayPenalty(k, -1)">-1s</button>
          <button type="button" @click="adjustAwayPenalty(k, 1)">+1s</button>
          <button type="button" @click="send({ type: 'RM_PENALTY_AWAY', payload: k })">X</button>
        </p>
      </div>
    </section>

  </main>
</template>

<style scoped>
  section {
    display: flex; 
    align-items: center;
    gap: 4px;
  }
  p {
    background-color: rgb(58, 58, 58);
    color: white; 
    padding: 8px 16px;
  }
  main {
    padding:16px; 
    display:grid; 
    gap:12px; 
    grid-auto-rows:min-content; 
    max-width:560px;
  }
  input {
    width: 3rem;
  }
  .penaltyBoxes {
    display: flex; 
    gap: 4px;
  }
</style>
