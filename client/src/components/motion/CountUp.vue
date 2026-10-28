<!--
  CountUp — copied from Vue Bits (https://vue-bits.dev, src/content/TextAnimations/CountUp),
  MIT + Commons Clause, © 2025 David Haz.
  Local changes: honours prefers-reduced-motion (jumps to the target), drops the
  unused direction/separator/callback props, re-animates when `to` changes.
-->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import { usePrefersReducedMotion } from '@/composables/usePrefersReducedMotion'

interface Props {
  to: number
  from?: number
  delay?: number
  duration?: number
}

const props = withDefaults(defineProps<Props>(), { from: 0, delay: 0, duration: 1 })

const elementRef = useTemplateRef<HTMLSpanElement>('elementRef')
const reducedMotion = usePrefersReducedMotion()
const currentValue = ref(props.from)
const isInView = ref(false)
let animationId: number | null = null
let observer: IntersectionObserver | null = null
let velocity = 0

const damping = () => 20 + 40 * (1 / props.duration)
const stiffness = () => 100 * (1 / props.duration)

function updateDisplay() {
  if (elementRef.value) elementRef.value.textContent = String(Math.round(currentValue.value))
}

function springAnimation() {
  const displacement = props.to - currentValue.value
  const acceleration = displacement * stiffness() - velocity * damping()
  velocity += acceleration * 0.016 // assuming 60fps
  currentValue.value += velocity * 0.016
  updateDisplay()

  if (Math.abs(displacement) > 0.01 || Math.abs(velocity) > 0.01) {
    animationId = requestAnimationFrame(springAnimation)
  } else {
    currentValue.value = props.to
    updateDisplay()
    animationId = null
  }
}

function start() {
  if (!isInView.value) return
  if (animationId) cancelAnimationFrame(animationId)
  if (reducedMotion.value) {
    currentValue.value = props.to
    updateDisplay()
    return
  }
  setTimeout(() => {
    velocity = 0
    animationId = requestAnimationFrame(springAnimation)
  }, props.delay * 1000)
}

watch(
  () => props.to,
  () => start(),
)

onMounted(() => {
  updateDisplay()
  if (!elementRef.value) return
  observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && !isInView.value) {
      isInView.value = true
      start()
    }
  })
  observer.observe(elementRef.value)
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  observer?.disconnect()
})
</script>

<template>
  <!-- the number is announced once at its final value, not on every frame -->
  <span class="num" :aria-label="String(to)"><span ref="elementRef" aria-hidden="true" /></span>
</template>
