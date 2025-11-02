<script setup>
import { state, clockText, formatPenaltyTime } from '../composables/useStore'
import { DEFAULT_OPPONENT_COLOR } from '../shared/scoreboard'
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
            <img class="team-logo"/>
            <span class="team-name" id="home-team">{{state.homeTeam}}</span>
            <span class="score" id="home-score">{{ state.home }}</span>
            <span v-if="state.homeEmptyNetVisible" class="empty-net">EMPTY NET</span>
          </div>

          <!-- Penalties -->
          <div class="penalties">
            <span v-for="item in state.homePenalties" :key="item.id" class="penalty">
              {{ item.player }} {{ formatPenaltyTime(item.remainingMs) }}
            </span>
          </div>
          
        </div>
        
      </div>

      <div id="guestteam">
        <div class="grid-with-penalties_guest">
          
          <!-- Team Name, Score -->
          <div class="guest-team opponent" :style="{ background: state.opponentColor || DEFAULT_OPPONENT_COLOR }">
            <span class="score" id="guest-score">{{ state.away }}</span>
            <span class="team-name" id="guest-team">{{state.awayTeam}}</span>
            <img class="team-logo"/>
            <span v-if="state.awayEmptyNetVisible" class="empty-net-right">EMPTY NET</span>
          </div>

          <!-- Penalties -->
          <div class="penalties">
            <span v-for="item in state.awayPenalties" :key="item.id" class="penalty">
              {{ item.player }} {{ formatPenaltyTime(item.remainingMs) }}
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
