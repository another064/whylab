import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'

import type { IconName } from '@/components/AppIcon.vue'
import { useTodayStore } from '@/stores/today'
import { useWorkspaceStore } from '@/stores/workspace'

export interface NavItem {
  key: 'today' | 'inquire' | 'review' | 'library' | 'mind'
  label: string
  icon: IconName
  to: RouteLocationRaw
  badge?: number
  dot?: boolean
}

/** Shared by SideNav and TabBar so the two never drift apart. */
export function useNav() {
  const router = useRouter()
  const today = useTodayStore()
  const workspace = useWorkspaceStore()

  const items = computed<NavItem[]>(() => {
    const conv = workspace.conversation
    return [
      { key: 'today', label: '今日', icon: 'today', to: { name: 'today' } },
      {
        key: 'inquire',
        label: '探究',
        icon: 'inquire',
        // back to the open conversation, otherwise to Today's ask box
        to: conv
          ? { name: 'inquiry', params: { id: conv.spaceId, cid: conv.id } }
          : { name: 'today', hash: '#ask' },
      },
      {
        key: 'review',
        label: '回忆',
        icon: 'review',
        to: { name: 'review' },
        badge: today.summary ? today.summary.reviewDue - today.summary.reviewDone : undefined,
      },
      { key: 'library', label: '知识库', icon: 'library', to: { name: 'library' } },
      { key: 'mind', label: '我的思维', icon: 'mind', to: { name: 'me' }, dot: !!today.summary?.noticed },
    ]
  })

  /** Open a space: its latest conversation, or Today with the space preselected. */
  async function openSpace(spaceId: string): Promise<void> {
    const list =
      workspace.conversationsBySpace[spaceId] ?? (await workspace.loadConversations(spaceId))
    const latest = list[0]
    await router.push(
      latest
        ? { name: 'inquiry', params: { id: spaceId, cid: latest.id } }
        : { name: 'today', query: { space: spaceId }, hash: '#ask' },
    )
  }

  return { items, openSpace }
}
