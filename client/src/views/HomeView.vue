<script setup lang="ts">
import AskPanel from '@/components/AskPanel.vue'
import BackendStatus from '@/components/BackendStatus.vue'

const CORE_LOOP = [
  { step: '1', title: '追问原理', text: 'AI 解释机制、推导与适用边界，支持基于上下文继续追问。' },
  { step: '2', title: '沉淀知识', text: '把关键问题、解释和个人理解保存为可编辑的知识节点。' },
  { step: '3', title: '主动复习', text: '隐藏答案先回忆，再根据表现安排下一次复习。' },
]
</script>

<template>
  <div class="home">
    <section class="hero">
      <p class="eyebrow">AI 学习平台 · MVP 工程骨架</p>
      <h1>
        不止知道答案，<br />
        还要能讲清楚<span class="accent">为什么</span>。
      </h1>
      <p class="lede">
        WhyLab 把一次性的 AI 问答，变成「追问 → 沉淀 → 回忆 → 复习」的长期学习过程。
        当前版本先验证一件事：前后端链路是否可靠地跑通。
      </p>
    </section>

    <div class="home-grid">
      <AskPanel />
      <BackendStatus />
    </div>

    <section class="loop" aria-labelledby="loop-title">
      <h2 id="loop-title">MVP 要打通的核心闭环</h2>
      <ol class="loop-list">
        <li v-for="item in CORE_LOOP" :key="item.step">
          <span class="loop-step">{{ item.step }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
          <span class="tag">待实现</span>
        </li>
      </ol>
      <p class="loop-footnote">
        本次交付只完成第 1 步的链路验证（提问 → 后端响应）。知识节点、复习调度与 SQLite 持久化见
        <code>docs/api-design.md</code> 的路线规划。
      </p>
    </section>
  </div>
</template>
