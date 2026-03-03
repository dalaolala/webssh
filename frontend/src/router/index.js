import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: () => import('@/views/Welcome.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/terminal/:serverId?',
    name: 'Terminal',
    component: () => import('@/views/Terminal.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/quick-connect',
    component: () => import('@/views/QuickConnectLayout.vue'),
    meta: { requiresAuth: true },
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
  },
  {
    path: '/terminal-new',
    name: 'TerminalNew',
    component: () => import('@/views/TerminalNew.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/group-management',
    name: 'GroupManagement',
    component: () => import('@/views/GroupManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user-management',
    name: 'UserManagement',
    component: () => import('@/views/UserManagement.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isQuickConnectOnly = localStorage.getItem('webssh_quick_connect_only') === 'true'

  // 检查是否需要认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next(isQuickConnectOnly ? '/quick-connect' : '/dashboard')
  } else if (to.meta.requiresAdmin && (!authStore.isAuthenticated || !authStore.user?.is_admin)) {
    // 检查管理员权限
    next(isQuickConnectOnly ? '/quick-connect' : '/dashboard')
  } else if (isQuickConnectOnly && to.path !== '/login' && to.path !== '/register' && !to.path.startsWith('/quick-connect')) {
    // 如果是仅快速连接模式，且目标路由不是快速连接相关、也不是登录注册，拦截并跳转
    next('/quick-connect')
  } else {
    next()
  }
})

export default router