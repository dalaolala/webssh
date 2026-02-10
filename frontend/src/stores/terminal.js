import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io } from 'socket.io-client'

export const useTerminalStore = defineStore('terminal', () => {
  const socket = ref(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const currentConnection = ref(null)
  const terminalOutput = ref('')
  const connectionError = ref(null)

  // 连接到Socket.IO服务器
  const connectSocket = (token) => {
    return new Promise((resolve, reject) => {
      socket.value = io({
        auth: {
          token
        }
      })

      socket.value.on('connect', () => {
        console.log('Socket连接成功')
        // 连接成功后立即发送认证
        socket.value.emit('authenticate', token)
      })

      socket.value.on('authenticated', (data) => {
        if (data.success) {
          console.log('Socket认证成功')
          // 认证成功后设置Socket事件监听器
          setupSocketListeners()
          resolve() // 认证成功，解析Promise
        } else {
          console.error('Socket认证失败:', data.error)
          reject(new Error('Socket认证失败'))
        }
      })

      socket.value.on('connect_error', (error) => {
        console.error('Socket连接错误:', error)
        reject(error)
      })

      // 设置连接超时
      setTimeout(() => {
        if (!socket.value.connected) {
          reject(new Error('Socket连接超时'))
        }
      }, 10000)
    })
  }

  // 监听Socket事件（在Socket连接建立后设置）
  const setupSocketListeners = () => {
    if (!socket.value || socket.value._listenersSetup) return

    // 标记已设置监听器，避免重复设置
    socket.value._listenersSetup = true

    socket.value.on('ssh-connected', () => {
      isConnected.value = true
      isConnecting.value = false
      connectionError.value = null
      console.log('SSH连接成功')
    })

    socket.value.on('ssh-data', (data) => {
      // 确保数据是字符串格式
      const output = typeof data === 'string' ? data : String(data)
      terminalOutput.value += output
      
      // 限制输出长度，防止内存溢出
      if (terminalOutput.value.length > 50000) {
        terminalOutput.value = terminalOutput.value.slice(-25000)
      }
    })

    socket.value.on('ssh-error', (data) => {
      isConnecting.value = false
      isConnected.value = false
      connectionError.value = data.error
      console.error('SSH连接错误:', data.error)
    })

    socket.value.on('ssh-closed', () => {
      isConnected.value = false
      isConnecting.value = false
      currentConnection.value = null
      console.log('SSH连接已关闭')
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      isConnecting.value = false
      console.log('Socket连接断开')
      // 清除监听器标记
      socket.value._listenersSetup = false
    })
  }

  // 连接到SSH服务器
  const connectToServer = async (serverId) => {
    if (!socket.value) {
      throw new Error('Socket未连接')
    }

    isConnecting.value = true
    connectionError.value = null
    terminalOutput.value = ''
    currentConnection.value = { serverId, type: 'saved' }

    socket.value.emit('connect-ssh', serverId)
  }

  // 快速连接
  const quickConnect = (connectionInfo) => {
    if (!socket.value) {
      throw new Error('Socket未连接')
    }

    isConnecting.value = true
    connectionError.value = null
    terminalOutput.value = ''
    currentConnection.value = { ...connectionInfo, type: 'quick' }

    socket.value.emit('quick-connect', connectionInfo)
  }

  // 发送命令到终端
  const sendCommand = (command) => {
    if (socket.value && isConnected.value) {
      socket.value.emit('send-command', command)
    }
  }

  // 发送输入到终端
  const sendInput = (input) => {
    if (socket.value && isConnected.value) {
      socket.value.emit('ssh-input', input)
    }
  }

  // 调整终端大小
  const resizeTerminal = (size) => {
    if (socket.value && isConnected.value) {
      socket.value.emit('resize', size)
    }
  }

  // 断开连接
  const disconnect = () => {
    if (socket.value) {
      socket.value.emit('disconnect-ssh')
    }
    
    isConnected.value = false
    isConnecting.value = false
    currentConnection.value = null
    terminalOutput.value = ''
    connectionError.value = null
  }

  // 清除终端输出
  const clearOutput = () => {
    terminalOutput.value = ''
  }

  // 断开Socket连接
  const disconnectSocket = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    
    isConnected.value = false
    isConnecting.value = false
    currentConnection.value = null
    terminalOutput.value = ''
    connectionError.value = null
  }

  return {
    socket,
    isConnected,
    isConnecting,
    currentConnection,
    terminalOutput,
    connectionError,
    connectSocket,
    connectToServer,
    quickConnect,
    sendCommand,
    sendInput,
    resizeTerminal,
    disconnect,
    clearOutput,
    disconnectSocket
  }
})