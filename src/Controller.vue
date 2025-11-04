<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { send, initSocket } from './composables/useSocket'
import { state, formatPenaltyTime } from './composables/useStore'
import { DEFAULT_OPPONENT_COLOR } from './shared/scoreboard'

const mm = ref(20)
const ss = ref(0)

const period = ref(state.period)
const homeTeamName = ref(state.homeTeam)
const awayTeamName = ref(state.awayTeam)
const opponentColor = ref(state.opponentColor || DEFAULT_OPPONENT_COLOR)
const homeEmptyNet = ref(Boolean(state.homeEmptyNetVisible))
const awayEmptyNet = ref(Boolean(state.awayEmptyNetVisible))
const clockCountsDown = ref(state.clockCountsDown ?? true)
const awayLogo = ref(state.awayLogo || '')

const nrHome = ref('')
const timeHome = ref(2)
const nrAway = ref('')
const timeAway = ref(2)

watch(() => state.period, (val) => { period.value = val })
watch(() => state.homeTeam, (val) => { homeTeamName.value = val })
watch(() => state.awayTeam, (val) => { awayTeamName.value = val })
watch(() => state.opponentColor, (val) => { opponentColor.value = val || DEFAULT_OPPONENT_COLOR })
watch(() => state.homeEmptyNetVisible, (val) => { homeEmptyNet.value = Boolean(val) })
watch(() => state.awayEmptyNetVisible, (val) => { awayEmptyNet.value = Boolean(val) })
watch(() => state.clockCountsDown, (val) => { clockCountsDown.value = val === undefined ? true : Boolean(val) })
watch(() => state.awayLogo, (val) => { awayLogo.value = val || '' })

const LOGO_ENDPOINT = '/api/logos'
const MAX_LOGO_BYTES = 750 * 1024
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/webp'])
const ALLOWED_LOGO_EXTENSIONS = new Set(['png', 'webp'])

function isAllowedLogoFile(file) {
  if (!file) return false
  const mime = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  if (ALLOWED_LOGO_TYPES.has(mime)) return true
  const ext = file.name?.split('.')?.pop()?.toLowerCase() || ''
  return ALLOWED_LOGO_EXTENSIONS.has(ext)
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function setAwayLogoValue(value) {
  awayLogo.value = typeof value === 'string' ? value : ''
}

async function uploadAwayLogo(file) {
  if (!file) return
  if (!isAllowedLogoFile(file)) {
    window.alert?.('Bitte nur PNG oder WebP Dateien auswaehlen.')
    return
  }
  if (file.size > MAX_LOGO_BYTES) {
    window.alert?.('Die Datei ist zu gross. Bitte ein Logo unter 750KB auswaehlen.')
    return
  }

  try {
    const data = await fileToBase64(file)
    const response = await fetch(LOGO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team: 'away',
        name: file.name,
        mimeType: file.type,
        data,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || typeof result?.path !== 'string') {
      throw new Error(result?.error || 'Upload fehlgeschlagen')
    }
    setAwayLogoValue(result.path)
  } catch (error) {
    console.error('Logo upload failed', error)
    window.alert?.('Logo konnte nicht hochgeladen werden.')
  }
}

function resetFileInput(event) {
  const target = event?.target
  if (target && 'value' in target) {
    target.value = ''
  }
}

async function onAwayLogoFileChange(event) {
  const file = event?.target?.files?.[0]
  await uploadAwayLogo(file)
  resetFileInput(event)
}

async function clearAwayLogo() {
  try {
    const response = await fetch(`${LOGO_ENDPOINT}?team=away`, { method: 'DELETE' })
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error(result?.error || 'DELETE_FAILED')
    }
    setAwayLogoValue('')
  } catch (error) {
    console.error('Logo clear failed', error)
    window.alert?.('Logo konnte nicht entfernt werden.')
  }
}

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

function onToggleHomeEmptyNet(event) {
  const next = Boolean(event?.target?.checked ?? homeEmptyNet.value)
  homeEmptyNet.value = next
  send({ type: 'SET_HOME_EMPTY_NET', payload: next })
}

function onToggleAwayEmptyNet(event) {
  const next = Boolean(event?.target?.checked ?? awayEmptyNet.value)
  awayEmptyNet.value = next
  send({ type: 'SET_AWAY_EMPTY_NET', payload: next })
}

function onToggleClockDirection(event) {
  const next = Boolean(event?.target?.checked ?? clockCountsDown.value)
  clockCountsDown.value = next
  send({ type: 'SET_CLOCK_DIRECTION', payload: next })
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
    
    <section style="display: flex; flex-direction: column; align-items: start;">
      <span>(nur png und webp)</span>

      <div>
        <label v-once for="away-logo-input">Away Logo</label>
        <input style="width: 100%;" id="away-logo-input" type="file" accept=".png,.webp" @change="onAwayLogoFileChange($event)">
        <button v-if="awayLogo" type="button" @click="clearAwayLogo">Entfernen</button>
      </div>
      
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
      <label for="opponent-color" style="margin-left: 0.5rem;">Farbe</label>
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

    <section style="gap: 1rem;">
      <div style="display: flex; align-items: center;">
        <label>Home Empty Net</label>
        <input type="checkbox" :checked="homeEmptyNet" @change="onToggleHomeEmptyNet" style="width: 1rem;"> 
      </div>
      <div style="display: flex; align-items: center;">
        <label>Away Empty Net</label>
        <input type="checkbox" :checked="awayEmptyNet" @change="onToggleAwayEmptyNet" style="width: 1rem;">
      </div>
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
      <label style="margin-left: 8px;">Countdown?</label>
      <input type="checkbox" :checked="clockCountsDown" @change="onToggleClockDirection" style="width: 1rem;">
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
    max-width:750px;
  }
  input {
    width: 3rem;
  }
  .penaltyBoxes {
    display: flex; 
    gap: 4px;
  }
</style>


