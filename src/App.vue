<script setup>
import { onMounted } from 'vue'
import { startClock } from './composables/useClock'
import { initBroadcast } from './composables/useBroadcast'
import Scoreboard from './components/Scoreboard.vue'

onMounted(() => {
  initBroadcast()
  startClock()
})
</script>

<template>
  <Scoreboard/>
</template>

<style>

</style>
