import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/quick-connect'
  },
  {
    path: '/quick-connect',
    component: () => import('@/views/QuickConnectLayout.vue'),
    children: [
      {
        path: '',
        name: 'QuickConnect',
        component: () => import('@/views/QuickConnect.vue')
      },
      {
        path: 'terminal',
        name: 'QuickConnectTerminal',
        component: () => import('@/views/QuickConnectTerminal.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 移除所有路由守卫，直接允许访问
router.beforeEach((to, from, next) => {
  next()
})

export default router