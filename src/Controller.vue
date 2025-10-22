<script setup>
import { ref } from 'vue'
import { send } from './composables/useBroadcast'

const mm = ref(20)
const ss = ref(0)

function setClock(){
  const ms = (Number(mm.value)*60 + Number(ss.value)) * 1000
  send({ type: 'SET_CLOCK', payload: ms })
}
</script>

<template>
  <main>
    <iframe src="../index.html" title="Scoreboard View"></iframe>

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
      <input v-model="mm" type="number" min="0"> :
      <input v-model="ss" type="number" min="0" max="59">
      <button @click="setClock">Set</button>
      <button @click="send({type:'RUN'})">Start</button>
      <button @click="send({type:'STOP'})">Stop</button>
      <button @click="send({type: 'RM_SEC'})">-1</button>
      <button @click="send({type: 'ADD_SEC'})">+1</button>
      <button @click="send({type:'RESET_CLOCK'})">Reset</button>
    </section>
  </main>
</template>

<style scoped>
  iframe {
    width: 150%;
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
