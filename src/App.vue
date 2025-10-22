<script setup>
import { onMounted } from 'vue'
import { startRafClock } from './composables/useRafClock'
import { initBroadcast } from './composables/useBroadcast'
import Scoreboard from './components/Scoreboard.vue'

onMounted(() => {
  initBroadcast()
  startRafClock()
})
</script>

<template>
  <Scoreboard/>
</template>

<style>

</style>
