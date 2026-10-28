<script setup lang="ts">
/**
 * One thinking-profile entry awaiting confirmation: statement, evidence,
 * what confirming changes, and 是这样 / 改一改 / 不太准.
 * `compact` is the Today-page version (no evidence quote, no edit).
 */
import { ref } from 'vue'

import { CATEGORY_LABEL, type Pattern } from '@/api/profile'

const props = withDefaults(defineProps<{ pattern: Pattern; compact?: boolean; busy?: boolean }>(), {
  compact: false,
  busy: false,
})
const emit = defineEmits<{ confirm: []; reject: []; edit: [statement: string] }>()

const editing = ref(false)
const draft = ref('')

function startEdit() {
  draft.value = props.pattern.statement
  editing.value = true
}

function saveEdit() {
  const text = draft.value.trim()
  if (!text) return
  emit('edit', text)
  editing.value = false
}
</script>

<template>
  <article class="pattern card card-you">
    <span class="category">{{ compact ? 'WhyLab 注意到' : CATEGORY_LABEL[pattern.category] }}</span>

    <form v-if="editing" class="edit" @submit.prevent="saveEdit">
      <label class="sr-only" :for="`pattern-edit-${pattern.id}`">改写这条描述</label>
      <textarea :id="`pattern-edit-${pattern.id}`" v-model="draft" class="textarea textarea-you" rows="2" />
      <div class="actions">
        <button class="btn btn-primary" type="submit" :disabled="!draft.trim() || busy">保存</button>
        <button class="btn btn-you-ghost" type="button" @click="editing = false">取消</button>
      </div>
    </form>
    <p v-else class="statement">{{ pattern.statement }}</p>

    <figure v-if="!compact && pattern.evidence.length" class="evidence">
      <blockquote>{{ pattern.evidence.join('') }}</blockquote>
      <figcaption>依据：{{ pattern.evidenceSource }}</figcaption>
    </figure>
    <p v-else-if="compact" class="note">
      来自{{ pattern.evidenceSource || `${pattern.evidenceCount} 次依据` }} ·
      <RouterLink :to="{ name: 'me' }">看看依据</RouterLink>
    </p>

    <div v-if="!editing" class="actions">
      <button class="btn btn-primary" type="button" :disabled="busy" @click="emit('confirm')">是这样</button>
      <button v-if="!compact" class="btn btn-you-ghost" type="button" :disabled="busy" @click="startEdit">
        改一改
      </button>
      <button class="btn btn-you-ghost" type="button" :disabled="busy" @click="emit('reject')">不太准</button>
    </div>
    <p v-if="pattern.effect" class="note">确认后：{{ pattern.effect }}</p>
  </article>
</template>

<style scoped>
.pattern {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: 18px;
  border-radius: 18px;
}

.category {
  font-size: var(--fs-2xs);
  font-weight: 700;
  color: var(--you-text);
}

.statement {
  font-size: var(--fs-body);
  line-height: 1.65;
  font-weight: 500;
}

.evidence {
  background: var(--surface);
  border-radius: 12px;
  padding: 10px var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.evidence blockquote {
  margin: 0;
  font-size: var(--fs-xs);
  line-height: 1.6;
  color: var(--text-body);
}

.evidence figcaption {
  font-size: var(--fs-2xs);
  color: var(--text-muted);
}

.note {
  font-size: var(--fs-xs);
  color: var(--you-text-strong);
}

.note a {
  color: var(--you-text);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.actions .btn {
  min-height: 40px;
}

.btn-you-ghost {
  border-color: var(--you-line-strong);
  background: transparent;
  color: var(--you-text-deep);
}

.btn-you-ghost:hover:not(:disabled) {
  background: var(--surface);
}

.edit {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
