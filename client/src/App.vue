<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink class="brand" :to="{ name: 'home' }">
        <span class="brand-mark" aria-hidden="true">W</span>
        <span class="brand-text">
          <strong>WhyLab</strong>
          <small>追问原理 · 沉淀知识 · 主动复习</small>
        </span>
      </RouterLink>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <span>WhyLab MVP · 当前为工程骨架阶段，尚未接入真实数据库与模型</span>
    </footer>
  </div>
</template>
