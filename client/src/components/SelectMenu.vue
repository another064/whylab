<script setup lang="ts">
/**
 * Styled single-select. A native <select> can't style its popup, so this is a
 * listbox: arrows / Home / End move, Enter / Space pick, Esc and Tab close.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

export interface SelectOption {
  value: string
  label: string
  /** draws a separator above, for actions like "+ 新建" */
  divided?: boolean
}

const props = defineProps<{
  options: SelectOption[]
  /** accessible name */
  label: string
  /** visible text before the current value, e.g. "放进：" */
  prefix?: string
  disabled?: boolean
}>()
const value = defineModel<string>({ required: true })

const id = useId()
const root = useTemplateRef<HTMLElement>('root')
const list = useTemplateRef<HTMLElement>('list')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const open = ref(false)
const active = ref(0)

const currentLabel = computed(
  () => props.options.find((o) => o.value === value.value)?.label ?? '请选择',
)

async function show() {
  if (props.disabled) return
  active.value = Math.max(
    props.options.findIndex((o) => o.value === value.value),
    0,
  )
  open.value = true
  await nextTick()
  list.value?.focus()
}

function hide(refocus = true) {
  open.value = false
  if (refocus) trigger.value?.focus()
}

function pick(index: number) {
  const option = props.options[index]
  if (option) value.value = option.value
  hide()
}

function onKeydown(event: KeyboardEvent) {
  const last = props.options.length - 1
  const moves: Record<string, number> = {
    ArrowDown: Math.min(active.value + 1, last),
    ArrowUp: Math.max(active.value - 1, 0),
    Home: 0,
    End: last,
  }
  if (event.key in moves) {
    event.preventDefault()
    active.value = moves[event.key] as number
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    pick(active.value)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    hide()
  } else if (event.key === 'Tab') {
    hide(false)
  }
}

function onOutside(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) hide(false)
}

onMounted(() => document.addEventListener('pointerdown', onOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside))
</script>

<template>
  <div ref="root" class="select-menu">
    <button
      ref="trigger"
      type="button"
      class="select-trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="`${label}：${currentLabel}`"
      :disabled="disabled"
      @click="open ? hide() : show()"
      @keydown.down.prevent="show"
      @keydown.up.prevent="show"
    >
      <span v-if="prefix" class="select-prefix">{{ prefix }}</span>
      <span class="select-value">{{ currentLabel }}</span>
      <AppIcon name="chevron-down" :size="16" class="select-chevron" :class="{ flipped: open }" />
    </button>

    <ul
      v-if="open"
      ref="list"
      class="select-list"
      role="listbox"
      tabindex="-1"
      :aria-label="label"
      :aria-activedescendant="`${id}-${active}`"
      @keydown="onKeydown"
    >
      <li
        v-for="(option, i) in options"
        :id="`${id}-${i}`"
        :key="option.value"
        class="select-option"
        :class="{ active: i === active, divided: option.divided }"
        role="option"
        :aria-selected="option.value === value"
        @pointerenter="active = i"
        @click="pick(i)"
      >
        <span class="select-option-label">{{ option.label }}</span>
        <AppIcon v-if="option.value === value" name="check" :size="16" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.select-menu {
  position: relative;
  min-width: 0;
}

.select-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 240px;
  min-height: var(--tap);
  padding: 0 var(--space-3) 0 14px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.select-trigger:hover:not(:disabled) {
  border-color: var(--ink);
}

.select-trigger[aria-expanded='true'] {
  border-color: var(--ink);
}

.select-prefix {
  flex: 0 0 auto;
}

.select-value {
  min-width: 0;
  color: var(--text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-chevron {
  flex: 0 0 auto;
  transition: transform var(--dur-fast) var(--ease-out);
}

.select-chevron.flipped {
  transform: rotate(180deg);
}

.select-list {
  position: absolute;
  z-index: 30;
  top: calc(100% + var(--space-1));
  right: 0;
  width: max-content;
  min-width: 100%;
  max-width: min(320px, 80vw);
  max-height: 280px;
  overflow-y: auto;
  padding: var(--space-1);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
  box-shadow: var(--shadow-float);
  outline: none;
}

.select-list:focus-visible {
  box-shadow: var(--shadow-float);
}

.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: var(--tap);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--fs-sm);
  color: var(--text);
  cursor: pointer;
}

.select-option.active {
  background: var(--surface-sunken);
}

.select-option[aria-selected='true'] {
  font-weight: 700;
}

.select-option.divided {
  position: relative;
  margin-top: 9px;
  color: var(--text-secondary);
}

.select-option.divided::before {
  content: '';
  position: absolute;
  inset: -5px 0 auto;
  height: 1px;
  background: var(--line);
}

.select-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .select-list {
    right: auto;
    left: 0;
  }
}
</style>
