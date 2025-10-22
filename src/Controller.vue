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
  <main style="padding:16px; display:grid; gap:12px; grid-auto-rows:min-content; max-width:560px;">
    <section>
      <button @click="send({type:'HOME+'})">Home +</button>
      <button @click="send({type:'HOME-'})">Home -</button>
      <button @click="send({type:'AWAY+'})">Away +</button>
      <button @click="send({type:'AWAY-'})">Away -</button>
    </section>
    <section>
      <label>P:</label>
      <input type="number" min="1" value="1" @change="e=>send({type:'PERIOD', payload: e.target.value})"/>
    </section>
    <section>
      <label>Zeit mm:ss</label>
      <input v-model="mm" type="number" min="0" style="width:4rem"> :
      <input v-model="ss" type="number" min="0" max="59" style="width:4rem">
      <button @click="setClock">Set</button>
    </section>
    <section>
      <button @click="send({type:'RUN'})">Start</button>
      <button @click="send({type:'STOP'})">Stop</button>
      <button @click="send({type:'RESET'})">Reset</button>
    </section>
  </main>
</template>

<style scoped>

</style>
