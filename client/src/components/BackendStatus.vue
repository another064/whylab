<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { useHealthStore } from '@/stores/health'

const health = useHealthStore()

const uptimeLabel = computed(() =>
  health.detail ? `${health.detail.uptimeSeconds}s` : '—',
)

function formatTime(value: Date | null): string {
  if (!value) return '—'
  return value.toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  void health.check()
})
</script>

<template>
  <aside class="panel status-panel" aria-labelledby="status-title">
    <header class="panel-head">
      <h2 id="status-title">后端连接</h2>
      <span class="status-pill" :data-status="health.status">
        <span class="dot" aria-hidden="true" />
        {{ health.statusLabel }}
      </span>
    </header>

    <p class="status-message">{{ health.message }}</p>

    <dl class="spec">
      <div>
        <dt>接口</dt>
        <dd>GET /api/health</dd>
      </div>
      <div>
        <dt>最近检测</dt>
        <dd>{{ formatTime(health.checkedAt) }}</dd>
      </div>
      <div>
        <dt>进程运行</dt>
        <dd>{{ uptimeLabel }}</dd>
      </div>
      <div>
        <dt>模型</dt>
        <dd>{{ health.detail?.status === 'ok' ? 'mock' : '—' }}</dd>
      </div>
    </dl>

    <button class="btn btn-ghost" type="button" :disabled="health.isChecking" @click="health.check()">
      {{ health.isChecking ? '检测中' : '重新检测' }}
    </button>
  </aside>
</template>
