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
      <span class="header-meta">MVP / 骨架阶段</span>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <footer class="app-footer">
      <span>WhyLab · 尚未接入数据库与真实模型</span>
      <span class="num">Vue 3 · Express 5 · SQLite 计划中</span>
    </footer>
  </div>
</template>
