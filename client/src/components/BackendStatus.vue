<script setup lang="ts">
import { onMounted } from 'vue'

import { useHealthStore } from '@/stores/health'

const health = useHealthStore()

function formatTime(value: Date | null): string {
  if (!value) return '—'
  return value.toLocaleTimeString('zh-CN', { hour12: false })
}

onMounted(() => {
  void health.check()
})
</script>

<template>
  <section class="card status-card" aria-labelledby="status-title">
    <header class="card-head">
      <h2 id="status-title">后端连接状态</h2>
      <span class="status-pill" :data-status="health.status">
        <span class="dot" aria-hidden="true" />
        {{ health.statusLabel }}
      </span>
    </header>

    <p class="status-message">{{ health.message }}</p>

    <dl class="status-meta">
      <div>
        <dt>接口</dt>
        <dd><code>GET /api/health</code></dd>
      </div>
      <div>
        <dt>最近检测</dt>
        <dd>{{ formatTime(health.checkedAt) }}</dd>
      </div>
      <div>
        <dt>服务状态</dt>
        <dd>{{ health.detail?.status ?? '—' }}</dd>
      </div>
      <div>
        <dt>运行时长</dt>
        <dd>{{ health.detail ? `${health.detail.uptimeSeconds}s` : '—' }}</dd>
      </div>
    </dl>

    <button class="btn btn-ghost" type="button" :disabled="health.isChecking" @click="health.check()">
      {{ health.isChecking ? '检测中…' : '重新检测' }}
    </button>
  </section>
</template>
