import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth.js'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const authStore = useAuthStore()
    
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          ElMessage.error('认证失败，请重新登录')
          authStore.logout()
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('权限不足，无法访问此资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误，请稍后重试')
          break
        default:
          ElMessage.error(data.error || '请求失败，请稍后重试')
      }
    } else if (error.request) {
      ElMessage.error('网络连接失败，请检查网络设置')
    } else {
      ElMessage.error('请求配置错误')
    }
    
    return Promise.reject(error)
  }
)

// 用户管理API
export const userAPI = {
  // 获取用户列表
  getUsers: (params = {}) => api.get('/users', { params }),
  
  // 获取用户详情
  getUser: (id) => api.get(`/users/${id}`),
  
  // 创建用户
  createUser: (userData) => api.post('/users', userData),
  
  // 更新用户
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  
  // 重置用户密码
  resetPassword: (id, password) => api.put(`/users/${id}/password`, { password }),
  
  // 删除用户
  deleteUser: (id) => api.delete(`/users/${id}`)
}

// 系统管理API
export const adminAPI = {
  // 获取系统统计
  getStats: () => api.get('/admin/stats'),
  
  // 系统健康检查
  getHealth: () => api.get('/admin/health'),
  
  // 清理连接日志
  cleanupLogs: (days) => api.post('/admin/cleanup', { days }),
  
  // 获取系统设置
  getSettings: () => api.get('/admin/settings'),
  
  // 更新系统设置
  updateSettings: (settings) => api.put('/admin/settings', settings)
}

// 服务器管理API
export const serverAPI = {
  // 获取服务器列表
  getServers: () => api.get('/servers'),
  
  // 创建服务器
  createServer: (serverData) => api.post('/servers', serverData),
  
  // 更新服务器
  updateServer: (id, serverData) => api.put(`/servers/${id}`, serverData),
  
  // 删除服务器
  deleteServer: (id) => api.delete(`/servers/${id}`)
}

export default api