<template>
  <div class="terminal-page">
    <el-container class="terminal-container">
      <!-- 顶部工具栏 -->
      <el-header class="terminal-header">
        <div class="header-back" @click="$router.back()">
          <span class="back-dot dot-red"></span>
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          <span class="back-text">返回</span>
        </div>
        <div class="header-title">
          <span class="server-name">{{ currentServer?.name || '快速连接' }}</span>
          <span class="server-host" v-if="currentServer">{{ currentServer.host }}:{{ currentServer.port }}</span>
        </div>
        <div class="header-right-placeholder"></div>
      </el-header>
      
      <!-- 主内容区域 -->
      <el-container class="main-content">
        <!-- SFTP文件管理器侧边栏 -->
        <el-aside 
          v-if="showSftp && terminalStore.isConnected" 
          class="sftp-sidebar"
          :width="sftpPanelWidth + 'px'"
        >
          <div class="sftp-header">
            <h3>文件管理器</h3>
            <el-button size="small" @click="connectSftp" :loading="sftpStore.loading">
              <el-icon><Connection /></el-icon>
              连接SFTP
            </el-button>
          </div>
          
          <SftpFileManager v-if="sftpStore.isConnected" />
          
          <div v-else class="sftp-prompt">
            <el-icon size="48" color="#909399"><Folder /></el-icon>
            <p>点击"连接SFTP"按钮启用文件管理</p>
          </div>
        </el-aside>
        
        <!-- 终端内容区域 -->
        <el-main class="terminal-main" :style="{ width: showSftp ? `calc(100% - ${sftpPanelWidth}px)` : '100%' }">
          <XtermTerminal 
            ref="terminalRef" 
            :is-connected="terminalStore.isConnected"
            @data="handleTerminalData"
            @resize="handleTerminalResize"
            @selection-change="hasSelection = $event"
          />
          
          <!-- 连接提示 -->
          <div v-if="terminalStore.isConnecting" class="connection-status">
            <el-alert 
              title="正在连接服务器..." 
              type="info" 
              show-icon 
              :closable="false"
              center
            />
          </div>
          
          <!-- 连接状态提示 -->
          <div v-if="terminalStore.connectionError" class="connection-error">
            <el-alert 
              :title="terminalStore.connectionError" 
              type="error" 
              show-icon 
              :closable="false"
            />
          </div>
          
          <div v-else-if="!terminalStore.isConnected && !terminalStore.isConnecting" class="connection-prompt">
            <div class="prompt-content">
              <el-icon size="48" color="#909399"><Monitor /></el-icon>
              <h3>准备连接</h3>
              <p>点击"连接"按钮开始SSH会话</p>
            </div>
          </div>
        </el-main>
      </el-container>
      
      <!-- 状态栏 -->
      <TerminalStatusBar 
        :is-connected="terminalStore.isConnected"
        :connection-display="currentServer ? `${currentServer.host}:${currentServer.port}` : ''"
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
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Connection, Close, Delete, Monitor, Folder, User, Document, Edit, Select } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import { useSftpStore } from '@/stores/sftp'
import SftpFileManager from '@/components/SftpFileManager.vue'
import TerminalStatusBar from '@/components/TerminalStatusBar.vue'
import CommandLibrary from '@/components/CommandLibrary.vue'
import XtermTerminal from '@/components/XtermTerminal.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const terminalStore = useTerminalStore()
const serversStore = useServersStore()
const authStore = useAuthStore()
const sftpStore = useSftpStore()

const terminalRef = ref()
const currentServer = ref(null)
const showSftp = ref(false)
const sftpPanelWidth = ref(350)
const showCommands = ref(false)
const hasSelection = ref(false)

// 注入命令（发送给终端）
const injectCommand = (cmd) => {
  if (terminalStore.isConnected) {
    terminalStore.sendInput(cmd + '\n')
    if (terminalRef.value) terminalRef.value.focus()
  } else {
    ElMessage.warning('当前没用连通的终端')
  }
}

const handleTerminalData = (data) => {
  if (terminalStore.isConnected) {
    terminalStore.sendInput(data)
  }
}

const handleTerminalResize = (dimensions) => {
  if (terminalStore.isConnected) {
    terminalStore.resizeTerminal(dimensions)
  }
}


// 连接到服务器
const connectToServer = async () => {
  if (!authStore.token) {
    if (terminalRef.value) {
      terminalRef.value.writeError('未认证，请重新登录后重试')
    }
    ElMessage.error('未认证，请重新登录')
    console.error('未认证')
    return
  }

  const serverId = route.params.serverId
  
  if (serverId) {
    // 获取服务器基本信息（不含密钥，仅用于界面显示）
    const result = await serversStore.getServerInfo(serverId)
    if (result.success) {
      currentServer.value = result.data.server
      
      // 初始化Socket连接（如果尚未连接）
      if (!terminalStore.socket) {
        try {
          await terminalStore.connectSocket(authStore.token)
          console.log('Socket连接和认证成功')
        } catch (error) {
          console.error('Socket连接或认证失败:', error)
          if (terminalRef.value) {
            terminalRef.value.writeError(`Socket连接失败: ${error.message}`)
          }
          ElMessage.error('Socket连接失败')
          return
        }
      }
      
      // 认证成功后进行SSH连接
      terminalStore.connectToServer(serverId)
    }
  }
}


const toggleSftpPanel = () => {
  showSftp.value = !showSftp.value
  setTimeout(() => {
    if (terminalRef.value) terminalRef.value.fit()
  }, 100)
}

// 连接SFTP
const connectSftp = async () => {
  if (!currentServer.value) {
    console.error('没有可用的服务器信息')
    return
  }
  
  const success = await sftpStore.connectSftp(currentServer.value)
  if (success) {
    console.log('SFTP连接成功')
  }
}


const copySelected = async () => {
  if (terminalRef.value) {
    const selection = terminalRef.value.getSelection()
    if (selection) {
      try {
        await navigator.clipboard.writeText(selection)
        
        // 添加复制成功视觉反馈
        const copyButton = document.querySelector('.copy-button')
        if (copyButton) {
          copyButton.classList.add('copied')
          setTimeout(() => {
            copyButton.classList.remove('copied')
          }, 1000)
        }
        
        // 显示成功消息
        ElMessage.success(`已复制 ${selection.length} 个字符`)
      } catch (error) {
        console.warn('复制失败:', error)
        ElMessage.error('复制失败，请重试')
      }
    } else {
      ElMessage.warning('请先选中要复制的文本')
    }
  }
}

const pasteFromClipboard = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      terminalStore.sendInput(text)
    }
  } catch (e) {}
}

const resetConnectedState = () => {
  terminalStore.clearOutput()
  if (terminalRef.value) {
    terminalRef.value.reset()
  }
}

// 监听终端输出变化，让滚动条跟随光标到底部
watch(() => terminalStore.terminalOutput, (newOutput, oldOutput) => {
  if (terminalRef.value && terminalStore.isConnected && newOutput !== oldOutput) {
    const newData = newOutput.slice(oldOutput.length)
    if (newData) {
      terminalRef.value.write(newData)
      if (newData.includes('\x1b[H') && newData.includes('\x1b[2J')) {
        resetConnectedState()
      } else {
        if (terminalStore.scrollOnUserInput) {
          terminalRef.value.scrollToBottom()
        }
      }
    }
  }
})

// 监听服务器连接状态变化
watch(() => terminalStore.isConnected, (isConnected, wasConnected) => {
  if (terminalRef.value) {
    if (isConnected && !wasConnected) {
      terminalRef.value.clear()
      terminalRef.value.focus()
      setTimeout(() => {
        terminalRef.value.reset()
      }, 100)
    } else if (!isConnected && wasConnected) {
      terminalRef.value.writeError('SSH连接已断开')
      sftpStore.disconnectSftp()
      showSftp.value = false
    }
    setTimeout(() => { terminalRef.value.fit() }, 150)
  }
})

// 监听连接错误
watch(() => terminalStore.connectionError, (error) => {
  if (terminalRef.value && error) {
    terminalRef.value.writeError(`连接错误: ${error}`)
  }
})


onMounted(async () => {
  await nextTick()
  
  // 如果是服务器连接，自动连接
  if (route.params.serverId) {
    await connectToServer()
  }
})

onUnmounted(() => {
  terminalStore.disconnectSocket()
  sftpStore.disconnectSftp()
})
</script>

<style scoped>
.terminal-page {
  height: 100vh;
  overflow: hidden;
  background-color: #1e1e1e;
}

.terminal-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
}

.terminal-header {
  background: linear-gradient(180deg, #3a3a3c 0%, #2d2d30 100%);
  border-bottom: 1px solid #1a1a1a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  color: white;
  height: 38px !important;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  position: relative;
}

.header-back {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease;
  z-index: 1;
}

.header-back:hover {
  background: rgba(255,255,255,0.12);
  color: #ffffff;
}

.back-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-red {
  background: #FF5F57;
  box-shadow: 0 0 6px rgba(255, 95, 87, 0.6);
}

.back-icon {
  font-size: 16px;
}

.back-text {
  font-size: 14px;
  letter-spacing: 0.2px;
}

.header-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.server-name {
  font-weight: 600;
  font-size: 13px;
  color: #e0e0e0;
  letter-spacing: 0.3px;
}

.server-host {
  font-size: 11px;
  color: #888;
  margin-top: 1px;
}

.header-right-placeholder {
  width: 60px;
}

.main-content {
  flex: 1;
  min-height: 0; /* 关键：允许 flex 子项缩小到内容以下 */
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
  height: 100%;
  min-height: 400px;
  overflow: hidden; /* 外层容器不需要滚动 */
  display: flex;
  flex-direction: column;
}

.terminal {
  width: 100%;
  height: 100%;
  padding: 0;
  padding-bottom: 8px; /* 底部留出缓冲，避免最后一行命令行贴边被遥盖 */
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

.prompt-content {
  color: #909399;
}

.prompt-content h3 {
  margin: 16px 0 8px;
  font-weight: normal;
}


/* xterm-helper-textarea: 仅隐藏视觉，保留事件监听能力（IME 修复需要） */
:deep(.xterm-helper-textarea) {
  opacity: 0 !important;
  color: transparent !important;
  caret-color: transparent !important;
  resize: none !important;
  outline: none !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 复制按钮高亮效果 */
.copy-button {
  transition: all 0.3s ease;
}

.copy-button.copied {
  background-color: rgba(58, 134, 255, 0.3) !important;
  border-color: rgba(58, 134, 255, 0.8) !important;
  color: #ffffff !important;
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(58, 134, 255, 0.4);
}

.copy-button:hover {
  background-color: rgba(58, 134, 255, 0.1);
  border-color: rgba(58, 134, 255, 0.6);
}

/* 终端选择文本高亮效果优化 */
:deep(.xterm .xterm-selection) {
  background-color: rgba(58, 134, 255, 0.2) !important;
  border-radius: 2px;
  mix-blend-mode: screen;
}

/* 统一终端滚动条样式 */
:deep(.xterm) {
  padding: 0 !important; /* 移除内边距，让内容从顶部开始 */
  overflow: hidden !important;
  position: relative !important;
  height: 100% !important;
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.xterm-screen) {
  background-color: #1e1e1e !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

:deep(.xterm-viewport) {
  background-color: #1e1e1e !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
  position: relative !important;
  direction: ltr !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: auto !important;
}

/* Webkit浏览器滚动条样式 */
:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 12px;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  margin: 2px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  border: 2px solid transparent;
  background-clip: content-box;
  transition: background 0.2s ease;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.5);
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:active) {
  background: rgba(255, 255, 255, 0.7);
}

/* 确保滚动条和屏幕可见 */
:deep(.xterm-screen) {
  overflow: visible !important;
  width: 100% !important;
  height: 100% !important;
  background-color: #1e1e1e !important;
}

:deep(.xterm-scroll-area) {
  overflow: visible !important;
}

/* 隐藏XTerm.js字符测量元素 */
:deep(.xterm-char-measure-element) {
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  visibility: hidden !important;
  width: auto !important;
  height: auto !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* 确保终端容器正确设置 */
.terminal {
  position: relative;
  overflow: hidden;
  pointer-events: auto !important;
  height: 100%;
  width: 100%;
  background-color: #1e1e1e !important;
  display: flex;
  flex-direction: column;
}

/* 确保终端文本可见 */
:deep(.xterm-rows) {
  color: #ffffff !important;
  background-color: #1e1e1e !important;
}

:deep(.xterm-row) {
  color: #ffffff !important;
  background-color: #1e1e1e !important;
}

:deep(.xterm-selection-layer) {
  background-color: rgba(54,99,181,0.35) !important;
}
</style>