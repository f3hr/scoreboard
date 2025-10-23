<script setup>
import { state, clockText } from '../composables/useStore'
</script>

<template>
 
  <div class="wrapper">
    
    <div class="scoreboard">

      <div class="logo-wrapper">
        <img v-if="state.gameTyp" :src="state.gameTyp" class="logo" id="gameTyp"/>
      </div>

      <div id="hometeam">
        <div class="grid-with-penalties_home">
          
          <!-- Team Name, Score -->
          <div class="home-team devils">
            <span class="team-name" id="home-team" v-once>Red Devils</span>
            <span class="score" id="home-score">{{ state.home }}</span>
          </div>

          <!-- Penalties -->
          <div class="penalties">
            <span v-for="(item,i) in state.homePenalties" :key="i" class="penalty">
              {{ item }}
            </span>
          </div>
          
        </div>
        
      </div>

      <div id="guestteam">
        <div class="grid-with-penalties_guest">
          
          <!-- Team Name, Score -->
          <div class="guest-team opponent">
            <span class="score" id="guest-score">{{ state.away }}</span>
            <span class="team-name" id="guest-team" v-once>ETV Ladies</span>
          </div>

          <!-- Penalties -->
          <div class="penalties">
            <span v-for="(item,i) in state.awayPenalties" :key="i" class="penalty">
              {{ item }}
            </span>
          </div>
          
        </div>
        
      </div>

      <span class="period" id="period">{{ state.period }}</span>

      <div class="time"><span class="game-clock" id="game-clock">{{ clockText }}</span></div>

    </div>

  </div>

</template>

<style scoped>
  
</style>
