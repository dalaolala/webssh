<template>
  <div class="terminal-page">
    <el-container class="terminal-container">
      <!-- 主内容区域 -->
      <el-container class="main-content">
        <!-- SFTP文件管理器侧边栏 -->
        <el-aside 
          v-if="showSftp" 
          class="sftp-sidebar"
          :width="sftpPanelWidth + 'px'"
        >
          <div class="sftp-header">
            <h3>文件管理器</h3>
            <el-button 
              size="small" 
              @click="connectSftp" 
              :loading="quickSftp.loading.value"
              :disabled="!isConnected"
            >
              <el-icon><Connection /></el-icon>
              连接SFTP
            </el-button>
          </div>
          
          <QuickSftpFileManager v-if="quickSftp.isConnected.value" :sftp="quickSftp" />
          
          <div v-else-if="!isConnected" class="sftp-prompt">
            <el-icon size="48" color="#909399"><Monitor /></el-icon>
            <p>请先等待 SSH 连接成功</p>
          </div>
          <div v-else class="sftp-prompt">
            <el-icon size="48" color="#909399"><Folder /></el-icon>
            <p>点击"连接SFTP"按钮启用文件管理</p>
          </div>
        </el-aside>
        
        <!-- 终端内容区域 -->
        <el-main class="terminal-main" :style="{ width: showSftp ? `calc(100% - ${sftpPanelWidth}px)` : '100%' }">
          <!-- 终端显示组件 (带有内置的右键菜单) -->
          <XtermTerminal 
            ref="terminalRef" 
            :is-connected="isConnected"
            @data="handleTerminalData"
            @resize="handleTerminalResize"
            @selection-change="hasSelection = $event"
          />
          
          <!-- 连接提示 -->
          <div v-if="isConnecting" class="connection-status-overlay">
            <div class="connecting-card">
              <div class="spinner-container">
                <div class="pulse-ring"></div>
                <el-icon class="is-loading" size="32" color="#409eff"><Loading /></el-icon>
              </div>
              <h3 class="connecting-title">正在建立安全连接</h3>
              <p class="connecting-desc">正在向目标服务器发起 SSH 连接请求...</p>
            </div>
          </div>
          
          <!-- 连接状态提示 -->
          <div v-if="connectionError" class="connection-error">
            <el-alert 
              :title="connectionError" 
              type="error" 
              show-icon 
              :closable="false"
            />
          </div>
          
          <div v-else-if="!isConnected && !isConnecting" class="connection-prompt">
            <div class="prompt-content">
              <el-icon size="48" color="#909399"><Monitor /></el-icon>
              <h3>准备连接</h3>
              <p>正在初始化快速连接...</p>
            </div>
          </div>
        </el-main>
      </el-container>
      
      <!-- 状态栏 -->
      <TerminalStatusBar 
        :is-connected="isConnected"
        :connection-display="connectionDisplay"
        :show-sftp="showSftp"
        @toggle-sftp="toggleSftpPanel"
        @show-commands="showCommands = true"
      />
    </el-container>

    <!-- 常用命令抽屉组件 -->
    <CommandLibrary v-model="showCommands" @command="injectCommand" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Connection, Close, Delete, Monitor, Folder, Document, Edit, Select, Tickets, Loading } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useQuickSftp } from '@/composables/useQuickSftp'
import { ElMessage } from 'element-plus'
import QuickSftpFileManager from '@/components/QuickSftpFileManager.vue'
import CommandLibrary from '@/components/CommandLibrary.vue'
import TerminalStatusBar from '@/components/TerminalStatusBar.vue'
import XtermTerminal from '@/components/XtermTerminal.vue'
import { io } from 'socket.io-client'

const props = defineProps({
  tabId: {
    type: String,
    required: true
  },
  connectionInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])
const router = useRouter()
const authStore = useAuthStore()
const quickSftp = useQuickSftp()

const terminalRef = ref(null)
const showSftp = ref(false)
const sftpPanelWidth = ref(350)

// 常用命令显示控制
const showCommands = ref(false)
const hasSelection = ref(false)

// 向终端注入并执行命令
const injectCommand = (cmd) => {
  if (socket && isConnected.value) {
    socket.emit('ssh-input', cmd + '\n')
    focusTerminal()
  } else {
    ElMessage.warning('终端尚未连接')
  }
}

let socket = null
let pingInterval = null

// 本地连接状态
const isConnected = ref(false)
const isConnecting = ref(false)
const connectionError = ref(null)

// 连接显示信息
const connectionDisplay = computed(() => {
  const conn = props.connectionInfo
  if (conn) {
    return `${conn.username || ''}@${conn.host || ''}:${conn.port || 22}`
  }
  return ''
})

const serverTitle = computed(() => {
  return props.connectionInfo?.name || '快速连接'
})

// 返回/关闭Tab
const goBack = () => {
  emit('close')
}

const handleTerminalData = (data) => {
  if (isConnected.value && socket) {
    socket.emit('ssh-input', data)
  }
}

const handleTerminalResize = (dimensions) => {
  if (isConnected.value && socket) {
    socket.emit('resize', dimensions)
  }
}

// 聚焦终端
const focusTerminal = () => {
  if (terminalRef.value) {
    terminalRef.value.focus()
  }
}

// 切换SFTP面板显示
const toggleSftpPanel = () => {
  showSftp.value = !showSftp.value
  
  setTimeout(() => {
    handleResize()
  }, 100)
}

// ------------- SFTP 相关 -------------
const connectSftp = async () => {
  try {
    const success = await quickSftp.connectSftp({
      host: props.connectionInfo.host,
      port: props.connectionInfo.port,
      username: props.connectionInfo.username,
      password: props.connectionInfo.password,
      privateKey: props.connectionInfo.privateKey
    })
    
    if (success) {
      ElMessage.success('SFTP连接成功')
    }
  } catch (error) {
    ElMessage.error('SFTP连接失败: ' + error.message)
  }
}

// 连接到服务器的新逻辑
const connectToServer = () => {
  isConnecting.value = true
  connectionError.value = null
  
  socket = io({
    auth: { token: authStore.token }
  })
  
  socket.on('connect', () => {
    socket.emit('authenticate', authStore.token)
  })
  
  socket.on('authenticated', (data) => {
    if (data.success) {
      socket.emit('quick-connect', props.connectionInfo)
    } else {
      handleError('认证失败')
    }
  })
  
  socket.on('connect_error', (err) => {
    handleError(err.message || '连接失败')
  })
  
  socket.on('ssh-connected', () => {
    isConnected.value = true
    isConnecting.value = false
    if (terminalRef.value) {
      terminalRef.value.clear()
      terminalRef.value.focus()
      setTimeout(() => {
        handleResize()
      }, 200)
    }
  })
  
  socket.on('ssh-data', (data) => {
    if (terminalRef.value) {
      terminalRef.value.write(typeof data === 'string' ? data : String(data))
    }
  })
  
  socket.on('ssh-error', (data) => {
    handleError(data.error)
  })
  
  socket.on('ssh-closed', () => {
    isConnected.value = false
    isConnecting.value = false
    quickSftp.disconnectSftp() // Changed from sftpStore.disconnectSftp()
    showSftp.value = false
    if (terminalRef.value) {
      terminalRef.value.writeError('SSH连接已断开')
    }
  })
  
  socket.on('disconnect', () => {
    isConnected.value = false
    isConnecting.value = false
  })
}

const handleError = (msg) => {
  isConnecting.value = false
  connectionError.value = msg
  if (terminalRef.value) {
    terminalRef.value.writeError(`连接错误: ${msg}`)
  }
}

// 监听窗口大小变化
const handleResize = () => {
  if (terminalRef.value) {
    terminalRef.value.fit()
  }
}

onMounted(async () => {
  await nextTick()
  window.addEventListener('resize', handleResize)
  
  if (terminalRef.value) {
    terminalRef.value.writeWarning('正在初始化连接...')
  }
  
  connectToServer()
})

onUnmounted(() => {
  if (pingInterval) {
    clearInterval(pingInterval)
  }
  
  // 销毁组件内部的 Socket 连接
  if (socket) {
    socket.disconnect()
    socket = null
  }

  // 断开独立的 SFTP
  if (quickSftp.isConnected.value) {
    quickSftp.disconnectSftp()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.terminal-page {
  height: 100%;
  overflow: hidden;
  background-color: #1c1c1e;
  display: flex;
  flex-direction: column;
}

.terminal-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1c1c1e;
}

.terminal-header {
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: white;
  height: 36px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.server-name {
  font-weight: 600;
  font-size: 16px;
}

.server-info {
  color: #909399;
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  overflow: hidden;
}

.sftp-sidebar {
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sftp-header {
  padding: 15px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
}

.sftp-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.sftp-prompt {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
  text-align: center;
  padding: 20px;
}

.sftp-prompt p {
  margin-top: 16px;
  font-size: 14px;
}

.terminal-main {
  padding: 0 !important;
  position: relative;
  transition: width 0.3s ease;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.terminal {
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 0;
  padding-bottom: 8px; /* 轻微底部间隙 */
  cursor: text;
  overflow: hidden;
  position: relative;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.terminal:hover {
  outline: 1px solid #3e3e42;
}

.connection-error,
.connection-prompt {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

/* 现代化连接状态遮罩层 */
.connection-status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(30, 30, 30, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
  animation: fadeIn 0.3s ease;
}

.connecting-card {
  background: linear-gradient(145deg, #2a2a2d, #222225);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
  transform: translateY(-20px);
}

.spinner-container {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #409eff;
  animation: pulse 1.5s cubic-bezier(0.25, 0.8, 0.25, 1) infinite;
  opacity: 0;
}

@keyframes pulse {
  0% { transform: scale(0.5); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

.connecting-title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 8px 0;
  letter-spacing: 0.5px;
}

.connecting-desc {
  color: #909399;
  font-size: 13px;
  margin: 0;
}

.prompt-content {
  color: #909399;
}

.prompt-content h3 {
  margin: 16px 0 8px;
  font-weight: normal;
}

/* 常用命令抽屉样式 */
.command-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.command-search {
  padding: 0 0 16px 0;
  position: sticky;
  top: 0;
  background-color: #fff;
  z-index: 5;
}

.command-collapse {
  flex: 1;
  overflow-y: auto;
  border-top: none;
}
.command-collapse::-webkit-scrollbar {
  width: 6px;
}
.command-collapse::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.cmd-count {
  margin-left: 6px;
  font-size: 12px;
  color: #909399;
}

.command-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.command-tabs .el-tabs__content) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.command-tabs .el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.private-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.private-io-actions {
  display: flex;
  gap: 4px;
}

.private-collapse {
  margin-top: 12px;
}

.private-item {
  border-left: 3px solid #67c23a;
}

.command-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 12px 0;
}

.command-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s;
}

.command-item:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.05);
}

.cmd-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.cmd-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.cmd-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.cmd-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

/* Command list and other specific QuickConnect styles */
</style>
