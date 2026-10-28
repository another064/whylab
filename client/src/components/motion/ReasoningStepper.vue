<!--
  ReasoningStepper — modelled on Vue Bits "Stepper" (https://vue-bits.dev, src/content/Components/Stepper),
  MIT + Commons Clause, © 2025 David Haz.
  Not a copy: the original is a multi-step wizard on motion-v. Here it is the
  vertical "你的推理路径" list — done steps in cocoa (you said it), the current one
  in mint, future ones dashed. New steps fade in with token durations.
-->
<script setup lang="ts">
export interface ReasoningStep {
  /** stable identity so only genuinely new steps animate in */
  key: string
  title: string
  note?: string
  state: 'done' | 'current' | 'todo'
}

defineProps<{ steps: ReasoningStep[] }>()
</script>

<template>
  <TransitionGroup tag="ol" name="step" class="stepper">
    <li v-for="(step, i) in steps" :key="step.key" class="step" :data-state="step.state">
      <div class="rail" aria-hidden="true">
        <span class="node">
          <svg v-if="step.state === 'done'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <span v-if="i < steps.length - 1" class="line" />
      </div>
      <div class="body">
        <span class="sr-only">{{ { done: '已完成：', current: '正在想：', todo: '还没到：' }[step.state] }}</span>
        <b v-if="step.state !== 'todo'" class="title">{{ step.title }}</b>
        <span v-else class="todo">{{ step.title }}</span>
        <span v-if="step.note" class="note">{{ step.note }}</span>
      </div>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.step {
  display: flex;
  gap: var(--space-3);
}

.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-on-ink);
}

[data-state='done'] .node {
  background: var(--you);
}

[data-state='current'] .node {
  border: 2px solid var(--ai);
  background: var(--ai-soft);
}

[data-state='todo'] .node {
  border: 2px dashed var(--line-strong);
}

.line {
  flex: 1 1 auto;
  width: 2px;
  min-height: 20px;
  background: var(--line);
}

[data-state='done'] .line {
  background: var(--you-line);
}

.body {
  padding-bottom: 14px;
  display: flex;
  flex-direction: column;
  font-size: var(--fs-sm);
  line-height: 1.6;
}

[data-state='current'] .title {
  color: var(--ai-text);
}

.todo {
  color: var(--text-muted);
}

.note {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.step-enter-active {
  transition:
    opacity var(--dur) var(--ease-out),
    transform var(--dur) var(--ease-out);
}

.step-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
</style>
