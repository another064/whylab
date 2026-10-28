<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppShell from '@/layouts/AppShell.vue'
import FocusLayout from '@/layouts/FocusLayout.vue'

const route = useRoute()
const layout = computed(() => (route.meta.layout === 'focus' ? FocusLayout : AppShell))
</script>

<template>
  <component :is="layout" />
</template>
