import { ref } from 'vue'
import { defineStore } from 'pinia'

import { fetchToday, type TodaySummary } from '@/api/today'
import { errorMessage, type LoadStatus } from '@/stores/workspace'

/** Today summary; also feeds the nav badge (due recall count). */
export const useTodayStore = defineStore('today', () => {
  const summary = ref<TodaySummary | null>(null)
  const status = ref<LoadStatus>('idle')
  const error = ref('')

  async function load(force = false): Promise<void> {
    if (status.value === 'ready' && !force) return
    status.value = 'loading'
    error.value = ''
    try {
      summary.value = await fetchToday()
      status.value = 'ready'
    } catch (e) {
      status.value = 'failed'
      error.value = errorMessage(e, '加载今日概览失败。')
    }
  }

  return { summary, status, error, load }
})
