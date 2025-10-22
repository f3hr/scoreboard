<script setup>
import { state, clockText } from '../composables/useStore'
</script>

<template>
  <div class="wrap">
    <div class="team" v-once>HOME</div>
    <div class="score">{{ state.home }}</div>
    <div class="sep" v-once>:</div>
    <div class="score">{{ state.away }}</div>
    <div class="team" v-once>AWAY</div>
    <div class="clock">{{ clockText }}</div>
    <div class="period">P{{ state.period }}</div>
  </div>

  <div class="wrapper">
    
    <div class="scoreboard">

      <div class="logo-wrapper">
        <img src="" class="logo" id="leagueLogo"/>
      </div>

      <div id="hometeam">
        <div class="grid-with-penalties_home">
          
          <!-- Team Name, Score -->
          <div class="home-team devils">
            <span class="team-name" id="home-team">Home Team</span>
            <span class="score" id="home-score">0</span>
          </div>

          <!-- Penalties (max. 3x) | inserted via controls -->
          <span class="penalty hidden" id="home-team_p1"></span>
          <span class="penalty hidden" id="home-team_p2"></span>
          <span class="penalty hidden" id="home-team_p3"></span>
          
        </div>
        
      </div>

      <div id="guestteam">
        <div class="grid-with-penalties_guest">
          
          <!-- Team Name, Score -->
          <div class="guest-team opponent">
            <span class="score" id="guest-score">0</span>
            <span class="team-name" id="guest-team">Guest Team</span>
          </div>

          <!-- Penalties (max. 3x) | inserted via controls -->
          <span class="penalty hidden" id="guest-team_p1"></span>
          <span class="penalty hidden" id="guest-team_p2"></span>
          <span class="penalty hidden" id="guest-team_p3"></span>
          
        </div>
        
      </div>

      <span class="period" id="period">0</span>

      <div class="time">
        <span class="game-clock" id="game-clock">00:00</span>
      </div>

    </div>

  </div>

</template>

<style scoped>

</style>
