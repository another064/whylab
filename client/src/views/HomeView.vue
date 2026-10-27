<script setup lang="ts">
import AskPanel from '@/components/AskPanel.vue'
import BackendStatus from '@/components/BackendStatus.vue'

const CORE_LOOP = [
  {
    title: '追问原理',
    text: 'AI 解释机制、推导与适用边界，并基于当前上下文继续追问。',
    status: '链路已通',
    done: true,
  },
  {
    title: '沉淀知识',
    text: '把关键问题、解释和个人理解保存为可编辑的知识节点。',
    status: '待实现',
    done: false,
  },
  {
    title: '主动复习',
    text: '隐藏答案先回忆，再按表现安排下一次复习时间。',
    status: '待实现',
    done: false,
  },
]

const RAIL_FACTS = [
  { value: '06', label: '后端测试通过' },
  { value: '02', label: '可用接口' },
  { value: '00', label: '张数据表' },
]
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="hero-copy rise" style="--i: 0">
        <p class="eyebrow">MVP / 工程骨架</p>
        <h1>
          不止知道答案，<br />
          还要能讲清楚<span class="accent">为什么</span>。
        </h1>
        <p class="lede">
          WhyLab 把一次性的 AI 问答，拉长为「追问 → 沉淀 → 回忆 → 复习」的过程。
          当前版本只验证一件事：问题提交后，前后端能不能稳定地把结构化解释送回页面。
        </p>
      </div>

      <aside class="hero-rail rise" style="--i: 1">
        <span class="rail-label">本阶段已验证</span>
        <ul class="rail-list">
          <li v-for="fact in RAIL_FACTS" :key="fact.label">
            <span class="num">{{ fact.value }}</span>
            <span>{{ fact.label }}</span>
          </li>
        </ul>
        <p class="rail-note">
          数据库、真实模型与复习调度按 <code>docs/api-design.md</code> 的顺序推进，不提前动工。
        </p>
      </aside>
    </header>

    <section class="workspace" aria-label="学习工作区">
      <AskPanel class="rise" style="--i: 2" />
      <BackendStatus class="rise" style="--i: 3" />
    </section>

    <section class="loop" aria-labelledby="loop-title">
      <header class="loop-head">
        <h2 id="loop-title">MVP 要打通的闭环</h2>
        <p class="loop-sub">STEP 01 — 03</p>
      </header>

      <ol class="loop-list">
        <li
          v-for="(item, index) in CORE_LOOP"
          :key="item.title"
          class="loop-row rise"
          :style="{ '--i': 4 + index }"
        >
          <span class="loop-index num">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="loop-body">
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </div>
          <span class="tag" :data-state="item.done ? 'done' : 'todo'">{{ item.status }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>
