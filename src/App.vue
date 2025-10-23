<script setup>
import { onMounted } from 'vue'
import { startClock } from './composables/useClock'
import { initSocket } from './composables/useSocket'
import Scoreboard from './components/Scoreboard.vue'

onMounted(() => {
  initSocket()
  startClock()
})
</script>

<template>
  <Scoreboard/>
</template>

<style>

</style>
