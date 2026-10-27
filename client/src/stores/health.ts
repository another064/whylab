import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { fetchHealth, type HealthData } from '@/api/health'
import { ApiError } from '@/api/http'

export type ConnectionStatus = 'idle' | 'checking' | 'online' | 'offline'

export const useHealthStore = defineStore('health', () => {
  const status = ref<ConnectionStatus>('idle')
  const message = ref('尚未检测后端连接')
  const detail = ref<HealthData | null>(null)
  const checkedAt = ref<Date | null>(null)

  const isChecking = computed(() => status.value === 'checking')
  const isOnline = computed(() => status.value === 'online')

  const statusLabel = computed(() => {
    switch (status.value) {
      case 'checking':
        return '检测中'
      case 'online':
        return '已连接'
      case 'offline':
        return '未连接'
      default:
        return '待检测'
    }
  })

  async function check(): Promise<void> {
    status.value = 'checking'
    message.value = '正在请求 /api/health …'

    try {
      const data = await fetchHealth()
      detail.value = data
      status.value = 'online'
      message.value = '后端服务运行正常'
    } catch (error) {
      detail.value = null
      status.value = 'offline'
      message.value =
        error instanceof ApiError ? error.message : '后端连接失败，请检查服务是否启动。'
    } finally {
      checkedAt.value = new Date()
    }
  }

  return {
    status,
    message,
    detail,
    checkedAt,
    isChecking,
    isOnline,
    statusLabel,
    check,
  }
})
