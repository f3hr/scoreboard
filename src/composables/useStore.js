import { reactive, computed } from 'vue'
import { createInitialState, formatMillis } from '../shared/scoreboard'

const base = createInitialState()

export const state = reactive({
  ...base,
  homePenalties: [...base.homePenalties],
  awayPenalties: [...base.awayPenalties],
})

export const clockText = computed(() => formatMillis(state.clockMs))

export const formatPenaltyTime = formatMillis
