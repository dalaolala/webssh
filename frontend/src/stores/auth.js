import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const isAuthenticated = ref(!!localStorage.getItem('token'))

  // 登录
  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      })

      const { token: newToken, user: userData } = response.data
      
      // 保存到本地存储
      localStorage.setItem('token', newToken)
      token.value = newToken
      user.value = userData
      isAuthenticated.value = true

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '登录失败' 
      }
    }
  }

  // 注册
  const register = async (email, phone, password) => {
    try {
      const response = await axios.post('/api/auth/register', {
        email,
        phone,
        password
      })

      const { token: newToken, user: userData } = response.data
      
      // 保存到本地存储
      localStorage.setItem('token', newToken)
      token.value = newToken
      user.value = userData
      isAuthenticated.value = true

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '注册失败' 
      }
    }
  }

  // 注销
  const logout = () => {
    localStorage.removeItem('token')
    token.value = null
    user.value = null
    isAuthenticated.value = false
  }

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })

      user.value = response.data.user
      return { success: true }
    } catch (error) {
      logout()
      return { success: false }
    }
  }

  // 修改密码
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.put('/api/auth/password', {
        currentPassword,
        newPassword
      }, {
        headers: {
          'Authorization': `Bearer ${token.value}`
        }
      })

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '修改密码失败' 
      }
    }
  }

  // 初始化认证状态
  const initializeAuth = async () => {
    if (token.value) {
      await fetchCurrentUser()
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    fetchCurrentUser,
    changePassword,
    initializeAuth
  }
})