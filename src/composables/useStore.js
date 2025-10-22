import { reactive, computed } from 'vue'

export const state = reactive({
  home: 0,
  away: 0,
  period: 1,
  clockMs: 20 * 60 * 1000, // 20:00
  running: false,
  _lastT: null
})

export const clockText = computed(() => {
  const ms = Math.max(0, state.clockMs)
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`
})
