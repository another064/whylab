import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import InquiryAside from '@/views/inquiry/InquiryAside.vue'
import InquiryView from '@/views/inquiry/InquiryView.vue'
import LibraryView from '@/views/LibraryView.vue'
import ProfileView from '@/views/ProfileView.vue'
import ReviewView from '@/views/ReviewView.vue'
import TodayView from '@/views/TodayView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    /** 'focus' = FocusLayout (no navigation). Default is AppShell. */
    layout?: 'shell' | 'focus'
    /** Which nav item is highlighted. */
    nav?: 'today' | 'inquire' | 'review' | 'library' | 'mind'
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'today', component: TodayView, meta: { nav: 'today', title: '今日' } },
  {
    path: '/spaces/:id/c/:cid',
    name: 'inquiry',
    // the right column is a named view so AppShell can place it per breakpoint
    components: { default: InquiryView, aside: InquiryAside },
    props: { default: true, aside: true },
    meta: { nav: 'inquire', title: '探究' },
  },
  {
    path: '/review',
    name: 'review',
    component: ReviewView,
    meta: { layout: 'focus', nav: 'review', title: '回忆' },
  },
  { path: '/library', name: 'library', component: LibraryView, meta: { nav: 'library', title: '知识库' } },
  { path: '/me', name: 'me', component: ProfileView, meta: { nav: 'mind', title: '我的思维' } },
  { path: '/:pathMatch(.*)*', redirect: { name: 'today' } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · WhyLab` : 'WhyLab'
})

export default router
