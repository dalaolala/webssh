import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from './auth'

export const useServersStore = defineStore('servers', () => {
  const servers = ref([])
  const groups = ref([])
  const loading = ref(false)

  const authStore = useAuthStore()

  // 获取所有服务器
  const fetchServers = async () => {
    loading.value = true
    try {
      const response = await axios.get('/api/servers', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      servers.value = response.data.servers
      await fetchGroups()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '获取服务器列表失败' 
      }
    } finally {
      loading.value = false
    }
  }

  // 获取服务器分组
  const fetchGroups = async () => {
    try {
      const response = await axios.get('/api/servers/groups', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      groups.value = response.data.groups
    } catch (error) {
      console.error('获取分组失败:', error)
    }
  }

  // 添加服务器
  const addServer = async (serverData) => {
    try {
      const response = await axios.post('/api/servers', serverData, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      
      await fetchServers()
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '添加服务器失败' 
      }
    }
  }

  // 更新服务器
  const updateServer = async (serverId, serverData) => {
    try {
      await axios.put(`/api/servers/${serverId}`, serverData, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      
      await fetchServers()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '更新服务器失败' 
      }
    }
  }

  // 删除服务器
  const deleteServer = async (serverId) => {
    try {
      await axios.delete(`/api/servers/${serverId}`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      
      await fetchServers()
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '删除服务器失败' 
      }
    }
  }

  // 获取服务器认证信息
  const getServerCredentials = async (serverId) => {
    try {
      const response = await axios.get(`/api/servers/${serverId}/credentials`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '获取认证信息失败' 
      }
    }
  }

  // 测试服务器连接（使用表单数据）
  const testConnection = async (connectionData) => {
    try {
      const response = await axios.post('/api/servers/test-connection', connectionData, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || '连接测试失败' 
      }
    }
  }

  // 按分组获取服务器
  const getServersByGroup = (groupName) => {
    return servers.value.filter(server => server.group_name === groupName)
  }

  return {
    servers,
    groups,
    loading,
    fetchServers,
    addServer,
    updateServer,
    deleteServer,
    getServerCredentials,
    testConnection,
    getServersByGroup
  }
})