<script setup lang="ts">
/**
 * One turn in a conversation. `speaker` decides the colour role:
 * AI = mint, you = cocoa (see tokens.css). Nothing else picks colours.
 */
withDefaults(
  defineProps<{
    speaker: 'ai' | 'you'
    /** 'quiet' = an earlier AI question, shown as plain secondary text */
    variant?: 'default' | 'quiet'
    /** visually smaller avatar for dense history */
    small?: boolean
  }>(),
  { variant: 'default', small: false },
)
</script>

<template>
  <div class="bubble-row" :data-speaker="speaker" :data-variant="variant">
    <span class="avatar" :class="{ small }" aria-hidden="true">{{ speaker === 'ai' ? 'W' : '你' }}</span>
    <span class="sr-only">{{ speaker === 'ai' ? 'WhyLab：' : '你：' }}</span>
    <div class="bubble">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.bubble-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.bubble-row[data-speaker='you'] {
  flex-direction: row-reverse;
}

.avatar {
  flex: 0 0 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-sm);
  font-weight: 700;
}

.avatar.small {
  flex-basis: 28px;
  height: 28px;
  font-size: var(--fs-2xs);
}

[data-speaker='ai'] .avatar {
  background: var(--ai);
  color: var(--text-on-ink);
  font-family: var(--font-num);
}

[data-speaker='you'] .avatar {
  background: var(--you);
  color: var(--ink);
}

.bubble {
  min-width: 0;
  font-size: var(--fs-md);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

[data-speaker='ai'] .bubble {
  flex: 1 1 auto;
}

[data-speaker='ai'][data-variant='quiet'] .bubble {
  padding-top: 5px;
  color: var(--text-secondary);
}

[data-speaker='you'] .bubble {
  max-width: min(560px, 85%);
  padding: var(--space-3) var(--space-4);
  border-radius: 16px 4px 16px 16px;
  background: var(--you-soft);
  border: 1px solid var(--you-line);
  white-space: pre-wrap;
}
</style>
