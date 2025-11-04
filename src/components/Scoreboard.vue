<script setup>
import { state, clockText, formatPenaltyTime } from '../composables/useStore'
import { DEFAULT_OPPONENT_COLOR } from '../shared/scoreboard'

const HOME_LOGO_PATH = '/logos/reddevils-logo-no-web-url.webp'
</script>

<template>
 
  <div class="wrapper">
    
    <div class="scoreboard">

      <div class="team-logo-wrapper">
        <img :src="HOME_LOGO_PATH" alt="Home team logo" class="team-logo"/>
      </div>

      <div id="hometeam">
       
        <!-- Team Name, Score -->
        <div class="home-team devils">
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

      <div id="guestteam">
        <div class="grid-with-penalties_guest">
          
          <!-- Team Name, Score -->
          <div class="guest-team opponent" :style="{ background: state.opponentColor || DEFAULT_OPPONENT_COLOR }">
            <span class="score" id="guest-score">{{ state.away }}</span>
            <span class="team-name" id="guest-team">{{state.awayTeam}}</span>
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

      <div class="team-logo-wrapper">
        <img v-if="state.awayLogo" :src="state.awayLogo" alt="Away team logo" class="team-logo"/>
        <div v-else class="team-logo" aria-hidden="true"></div>
      </div>

      <span class="period" id="period">{{ state.period }}</span>

      <div class="time"><span class="game-clock" id="game-clock">{{ clockText }}</span></div>

    </div>

  </div>

</template>

<style scoped>
  
</style>
