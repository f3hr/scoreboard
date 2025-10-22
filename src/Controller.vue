<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { send } from './composables/useBroadcast'
import { state } from './composables/useStore'

const mm = ref(20)
const ss = ref(0)

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

function onKey(e) {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const todo = keymap[k]
  if (!todo) return
  if (k.startsWith('Arrow')) e.preventDefault()
  if (e.repeat) return
  send(todo)
}

onMounted(() => {
  window.addEventListener('keydown', onKey, {passive: false});
  
  const handler = (e) => { e.preventDefault(); e.returnValue = ''; }
  window.addEventListener('beforeunload', handler);
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey),
  window.removeEventListener('beforeunload', handler)
})

</script>

<template>
  <main>
    <div style="display: flex; flex-direction: column;">
      <iframe src="../index.html" title="Scoreboard View"></iframe>
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
      <button @click="send({type:'HOME+'})">Home+</button>
      <button @click="send({type:'HOME-'})">Home-</button>
      <button @click="send({type:'AWAY+'})">Away+</button>
      <button @click="send({type:'AWAY-'})">Away-</button>
    </section>

    <section>
      <label>P: </label>
      <input v-model="p" type="text">
      <button @click="send({type:'PERIOD', payload: p})">Set</button>
    </section>

    <section>
      <label>Zeit mm:ss </label>
      <input v-model="mm" type="number" min="0">
      <span>:</span>
      <input v-model="ss" type="number" min="0" max="59">
      <button @click="setClock">Set</button>
      <button @click="send({type:'RESET_CLOCK'})">Reset</button>
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
    width: 2rem;
  }
</style>
