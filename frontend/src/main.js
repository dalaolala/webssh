import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import axios from 'axios'

import App from './App.vue'
import router from './router'

// 配置axios拦截器自动添加认证头
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// 配置axios响应拦截器处理认证错误
axios.interceptors.response.use((response) => {
  return response
}, (error) => {
  if (error.response?.status === 401) {
    // 清除本地存储的token并重定向到登录页
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  return Promise.reject(error)
})

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 初始化认证状态
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
authStore.initializeAuth().then(() => {
  app.mount('#app')
})