<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { send, initBroadcast } from './composables/useBroadcast'
import { state } from './composables/useStore'

const mm = ref(20)
const ss = ref(0)

const selected = ref(state.gameTyp)
const period = ref(state.period)
const nr = ref('')
const min = ref(2)
const nrAway = ref('')
const minAway = ref(2)

watch(() => state.gameTyp, (val) => { selected.value = val})
watch(() => state.period, (val) => { period.value = val})

function setClock(){
  const ms = (Number(mm.value)*60 + Number(ss.value)) * 1000
  send({ type: 'SET_CLOCK', payload: ms })
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
  initBroadcast()
  window.addEventListener('keydown', onKey, {passive: false});
  window.addEventListener('beforeunload', beforeUnloadHandler);
  send({ type: 'REQUEST_HOME_PENALTIES' })
  send({ type: 'REQUEST_AWAY_PENALTIES' })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})

</script>

<template>
  <main>
    
    <section style="display: flex; flex-direction: column;">
      <iframe src="../index.html" title="Scoreboard View"></iframe>
      <div style="display: flex; gap: 0.5rem; width: 150%;">
        <p>"ö" Uhr stoppen</p>
        <p>"ä" Uhr fortsetzen</p>
        <p>"ArrowLeft" -1s</p>
        <p>"ArrowRight" +1s</p>
        <p>"ArrowUp" +5s</p>
        <p>"ArrowDown" -5s</p>
      </div>
    </section>
    
    <section>
      <select v-model="selected" @change="send({ type: 'SET_GAME-TYP', payload: selected})">
        <option disabled value="">auswählen</option>
        <option value="dfbl.svg" >1. FBL Damen</option>
        <option value="fbl.svg">2. FBL Herren</option>
        <option value="pokal.svg">FD Pokal</option>
      </select>
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
      <span>Penalty Home Team (2min = 120, 10min = 600) </span>
      <label><input v-model="nr" type="number" min="1" max="99"></label>
      <label><input v-model="min" type="number" min="2" max="10"></label>
      <button @click="send({type:'ADD_PENALTY_HOME', payload: nr.toString() + ' ' + min.toString() + ':00'})">Set</button>
    </section>

    <section>
      <div class="penaltyBoxes">
        <p v-for="(item,j) in state.homePenalties" :key="j">
          {{ item }}
          <button type="button" @click="send({ type: 'RM_PENALTY_HOME', payload: j })">X</button>
        </p>
      </div>
    </section>

    <section>
      <span>Penalty Away Team (2min = 120, 10min = 600) </span>
      <label><input v-model="nrAway" type="number" min="1" max="99"></label>
      <label><input v-model="minAway" type="number" min="2" max="10"></label>
      <button @click="send({type:'ADD_PENALTY_AWAY', payload: nrAway.toString() + ' ' + minAway.toString() + ':00'})">Set</button>
    </section>

    <section>
      <div class="penaltyBoxes">
        <p v-for="(item,k) in state.awayPenalties" :key="k">
          {{ item }}
          <button type="button" @click="send({ type: 'RM_PENALTY_AWAY', payload: k })">X</button>
        </p>
      </div>
    </section>

  </main>
</template>

<style scoped>
  iframe {
    width: 150%;
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
