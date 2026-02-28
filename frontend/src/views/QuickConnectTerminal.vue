<template>
  <div class="terminal-page">
    <el-container class="terminal-container">
      <!-- 顶部工具栏 -->
      <el-header class="terminal-header" height="36px">
        <div class="header-left">
          <el-button @click="goBack" size="small" text style="color: #ccc;">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="server-name">{{ serverTitle }}</span>
          <span class="server-info">{{ connectionDisplay }}</span>
        </div>
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
          <div 
            ref="terminalRef" 
            class="terminal" 
            @click="focusTerminal"
            @contextmenu.prevent="showContextMenu"
          ></div>
          
          <!-- 右键菜单 -->
          <div 
            v-if="contextMenu.visible" 
            class="context-menu" 
            :style="{ 
              left: contextMenu.x + 'px', 
              top: contextMenu.y + 'px' 
            }"
            @mouseleave="hideContextMenu"
          >
            <div 
              class="menu-item" 
              @click="copyFromContextMenu"
              :class="{ disabled: !hasSelection }"
            >
              <el-icon><DocumentCopy /></el-icon>
              <span>复制</span>
            </div>
            <div class="menu-divider"></div>
            <div 
              class="menu-item" 
              @click="pasteFromContextMenu"
              :class="{ disabled: !terminalStore.isConnected }"
            >
              <el-icon><DocumentAdd /></el-icon>
              <span>粘贴</span>
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" @click="selectAllFromContextMenu">
              <el-icon><Select /></el-icon>
              <span>全选</span>
            </div>
            <div class="menu-divider"></div>
            <div class="menu-item" @click="clearTerminal">
              <el-icon><Delete /></el-icon>
              <span>清屏</span>
            </div>
          </div>
          
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
              <p>正在初始化快速连接...</p>
            </div>
          </div>
        </el-main>
      </el-container>
      
      <!-- 状态栏 -->
      <el-footer class="terminal-footer" v-if="terminalStore.isConnected">
        <div class="status-bar">
          <span class="status-item">
            <el-icon><Connection /></el-icon>
            已连接
          </span>
          <span class="status-item">
            <el-icon><Monitor /></el-icon>
            {{ connectionDisplay }}
          </span>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { ArrowLeft, Connection, Close, Delete, Monitor, Folder, Document, Edit, DocumentCopy, DocumentAdd, Select } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'
import { useAuthStore } from '@/stores/auth'
import { useSftpStore } from '@/stores/sftp'
import { ElMessage } from 'element-plus'
import SftpFileManager from '@/components/SftpFileManager.vue'

const router = useRouter()
const terminalStore = useTerminalStore()
const authStore = useAuthStore()
const sftpStore = useSftpStore()

const terminalRef = ref()
const showSftp = ref(false)
const sftpPanelWidth = ref(350)

// 右键菜单相关
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0
})

let term = null
let fitAddon = null
let initialScrollTop = 0
let wheelHandler = null
let viewportWheelHandler = null
let isComposing = false

// 连接显示信息（从 terminalStore.currentConnection 获取）
const connectionDisplay = computed(() => {
  const conn = terminalStore.currentConnection
  if (conn) {
    return `${conn.username || ''}@${conn.host || ''}:${conn.port || 22}`
  }
  return ''
})

const serverTitle = computed(() => {
  const conn = terminalStore.currentConnection
  return conn?.name || '快速连接'
})

// 返回快速连接页面
const goBack = () => {
  terminalStore.disconnect()
  router.push('/quick-connect')
}

// 初始化终端
const initTerminal = () => {
  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Courier New, monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#ffffff',
      cursorAccent: '#ffffff',
      selection: 'rgba(58, 134, 255, 0.3)',
      selectionForeground: undefined
    },
    disableStdin: false,
    scrollback: 10000,
    convertEol: true,
    allowTransparency: false,
    tabStopWidth: 8,
    cursorStyle: 'block',
    bellStyle: 'sound',
    allowProposedApi: true,
    windowsMode: true,
    screenReaderMode: false,
    scrollOnUserInput: true,
    scrollOnOutput: false,
    scrollSensitivity: 3,
    smoothScrollDuration: 0,
    fastScrollSensitivity: 5,
    fastScrollModifier: 'alt',
    macOptionIsMeta: false,
    macOptionClickForcesSelection: false,
    rightClickSelectsWord: false,
    rendererType: 'canvas',
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  
  const webLinksAddon = new WebLinksAddon()
  term.loadAddon(webLinksAddon)
  
    if (terminalRef.value) {
      term.open(terminalRef.value)
      fitAddon.fit()
      
      term.focus()
      
      // IME 修复（与 Terminal.vue 相同）
      const setupHelperTextarea = () => {
        const textarea = terminalRef.value?.querySelector('.xterm-helper-textarea')
        if (textarea && !textarea._imeFixed) {
          textarea._imeFixed = true

          textarea.style.opacity = '0'
          textarea.style.color = 'transparent'
          textarea.style.position = 'absolute'
          textarea.style.bottom = '4px'
          textarea.style.left = '4px'
          textarea.style.width = '1px'
          textarea.style.height = '1px'
          textarea.style.zIndex = '1'
          textarea.style.caretColor = 'transparent'

          textarea.addEventListener('compositionstart', (e) => {
            isComposing = true
            e.stopImmediatePropagation()
          }, true)

          textarea.addEventListener('compositionupdate', (e) => {
            e.stopImmediatePropagation()
          }, true)

          textarea.addEventListener('compositionend', (e) => {
            e.stopImmediatePropagation()
            isComposing = false
            const text = e.data
            if (text && terminalStore.isConnected) {
              terminalStore.sendInput(text)
            }
            Promise.resolve().then(() => { textarea.value = '' })
          }, true)
        }
      }
      
      setupHelperTextarea()
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            setupHelperTextarea()
          }
        })
      })
      
      observer.observe(terminalRef.value, { childList: true, subtree: true })
      
      // 处理终端输入
      term.onData((data) => {
        if (isComposing) {
          return
        }
        if (terminalStore.isConnected) {
          terminalStore.sendInput(data)
        } else {
          term.write('\r\n\x1b[31m未连接到服务器，请先连接\x1b[0m\r\n')
        }
      })
      
      // 优化鼠标滚轮事件处理
      const enableWheelScroll = () => {
        const viewport = terminalRef.value?.querySelector('.xterm-viewport')
        if (viewport) {
          if (viewportWheelHandler) {
            viewport.removeEventListener('wheel', viewportWheelHandler)
          }
          
          viewportWheelHandler = (event) => {
            event.preventDefault()
            const deltaY = event.deltaY
            const deltaMode = event.deltaMode
            
            if (deltaMode === 0) {
              const scrollAmount = Math.sign(deltaY) * Math.ceil(Math.abs(deltaY) / 8)
              viewport.scrollTop += scrollAmount * 20
            } else if (deltaMode === 1) {
              viewport.scrollTop += deltaY * 20
            } else {
              viewport.scrollTop += deltaY * viewport.clientHeight
            }
          }
          
          viewport.addEventListener('wheel', viewportWheelHandler, { passive: false })
          
          viewport.style.overflowY = 'auto'
          viewport.style.overflowX = 'hidden'
        }
      }
      
      enableWheelScroll()
      
      const wheelObserver = new MutationObserver(() => {
        enableWheelScroll()
      })
      wheelObserver.observe(terminalRef.value, { childList: true, subtree: true })
      
      wheelHandler = (e) => {
        const viewport = terminalRef.value?.querySelector('.xterm-viewport')
        if (viewport) {
          e.preventDefault()
          viewport.scrollTop += e.deltaY
        }
      }
      terminalRef.value.addEventListener('wheel', wheelHandler, { passive: false })
    
    // 处理终端按键事件
    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && 
          !['c', 'v', 'a', 'z', 'x', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
      return true
    })
    
    // 防止空格触发容器或页面滚动
    term.attachCustomKeyEventHandler((event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        if (terminalStore.isConnected) {
          terminalStore.sendInput(' ')
          term.scrollToBottom()
        }
        return false
      }
      return true
    })
    
    // 添加粘贴支持
    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        navigator.clipboard.readText().then(text => {
          if (terminalStore.isConnected) {
            terminalStore.sendInput(text)
          }
        }).catch(err => {
          console.warn('粘贴失败:', err)
        })
        return false
      }
      return true
    })
    
    // 添加复制支持
    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        const selection = term.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection).catch(err => {
            console.warn('复制失败:', err)
          })
        }
      }
      return true
    })
  }
}

// 聚焦终端
const focusTerminal = () => {
  if (term) {
    term.focus()
  }
}

// 切换SFTP面板显示
const toggleSftpPanel = () => {
  showSftp.value = !showSftp.value
  
  setTimeout(() => {
    handleResize()
  }, 100)
}

// 连接SFTP
const connectSftp = async () => {
  const conn = terminalStore.currentConnection
  if (!conn) {
    console.error('没有可用的连接信息')
    return
  }
  
  const success = await sftpStore.connectSftp(conn)
  if (success) {
    console.log('SFTP连接成功')
  }
}

// 右键菜单相关功能
const showContextMenu = (event) => {
  event.preventDefault()
  
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

// 全局点击关闭右键菜单
const onDocumentClick = () => {
  if (contextMenu.value.visible) {
    hideContextMenu()
  }
}

const hasSelection = () => {
  return term && term.getSelection() && term.getSelection().length > 0
}

const copyFromContextMenu = async () => {
  if (term && hasSelection()) {
    const selection = term.getSelection()
    try {
      await navigator.clipboard.writeText(selection)
      ElMessage.success(`已复制 ${selection.length} 个字符`)
      hideContextMenu()
    } catch (error) {
      console.warn('复制失败:', error)
      ElMessage.error('复制失败，请重试')
    }
  }
}

const pasteFromContextMenu = async () => {
  if (term && terminalStore.isConnected) {
    try {
      const text = await navigator.clipboard.readText()
      terminalStore.sendInput(text)
      hideContextMenu()
    } catch (error) {
      console.warn('粘贴失败:', error)
      ElMessage.error('粘贴失败，请重试')
    }
  }
}

const selectAllFromContextMenu = () => {
  if (term) {
    term.selectAll()
    hideContextMenu()
  }
}

const clearTerminal = () => {
  resetConnectedState()
}

const copySelected = async () => {
  if (term) {
    const selection = term.getSelection()
    if (selection) {
      try {
        await navigator.clipboard.writeText(selection)
        
        const copyButton = document.querySelector('.copy-button')
        if (copyButton) {
          copyButton.classList.add('copied')
          setTimeout(() => {
            copyButton.classList.remove('copied')
          }, 1000)
        }
        
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
  if (term) {
    term.reset()
    term.focus()
    term.write('\x1b[32mSSH连接已建立，可以开始输入命令\x1b[0m\r\n\r\n')
    term.write('\x1b[?25h')
    if (typeof term.scrollToTop === 'function') {
      term.scrollToTop()
    }
    const viewport = terminalRef.value?.querySelector('.xterm-viewport')
    if (viewport) {
      viewport.scrollTop = initialScrollTop || 0
    }
  }
}

// 监听终端输出变化
watch(() => terminalStore.terminalOutput, (newOutput, oldOutput) => {
  if (term && terminalStore.isConnected && newOutput !== oldOutput) {
    const newData = newOutput.slice(oldOutput.length)
    if (newData) {
      term.write(newData)
      if (newData.includes('\x1b[H') && newData.includes('\x1b[2J')) {
        resetConnectedState()
      } else {
        if (terminalStore.scrollOnUserInput) {
          term.scrollToBottom()
        }
      }
    }
  }
})

// 监听服务器连接状态变化
watch(() => terminalStore.isConnected, (isConnected, wasConnected) => {
  if (term) {
    if (isConnected && !wasConnected) {
      term.clear()
      term.focus()
      
      setTimeout(() => {
        term.write('\x1b[32mSSH连接已建立，可以开始输入命令\x1b[0m\r\n\r\n')
        
        term.write('\x1b[?25h')
        
        if (typeof term.scrollToTop === 'function') {
          term.scrollToTop()
        }
        
        const viewport = terminalRef.value?.querySelector('.xterm-viewport')
        if (viewport) {
          initialScrollTop = 0
          viewport.scrollTop = 0
          
          setTimeout(() => {
            viewport.scrollTop = 0
          }, 50)
        }
      }, 100)
    } else if (!isConnected && wasConnected) {
      term.write('\r\n\x1b[31mSSH连接已断开\x1b[0m\r\n')
      
      sftpStore.disconnectSftp()
      showSftp.value = false
    }
    setTimeout(() => { handleResize() }, 150)
  }
})

// 监听连接错误
watch(() => terminalStore.connectionError, (error) => {
  if (term && error) {
    term.write(`\r\n\x1b[31m连接错误: ${error}\x1b[0m\r\n`)
  }
})

// 监听窗口大小变化
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
    
    const dimensions = fitAddon.proposeDimensions()
    if (dimensions) {
      terminalStore.resizeTerminal({
        rows: dimensions.rows,
        cols: dimensions.cols,
        height: dimensions.height,
        width: dimensions.width
      })
    }
  }
}

onMounted(async () => {
  await nextTick()
  initTerminal()
  
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', onDocumentClick)
  
  // 快速连接模式：连接已由 QuickConnect.vue 发起
  // 如果连接已建立且有缓冲输出，立即写入终端
  await nextTick()
  
  if (terminalStore.isConnected && term) {
    // 已连接：显示欢迎信息
    term.clear()
    term.write('\x1b[32mSSH连接已建立，可以开始输入命令\x1b[0m\r\n\r\n')
    
    // 写入已缓冲的输出数据
    if (terminalStore.terminalOutput) {
      term.write(terminalStore.terminalOutput)
    }
    
    // 发送 resize 触发服务器重新绘制（关键：让远程 shell 发送完整的提示符）
    setTimeout(() => {
      handleResize()
      term.focus()
    }, 200)
  } else if (terminalStore.isConnecting && term) {
    term.write('\x1b[33m正在连接服务器...\x1b[0m\r\n')
  }
})

onUnmounted(() => {
  terminalStore.disconnectSocket()
  sftpStore.disconnectSftp()
  if (term) {
    term.dispose()
  }
  if (terminalRef.value && wheelHandler) {
    terminalRef.value.removeEventListener('wheel', wheelHandler)
    wheelHandler = null
  }
  const viewportEl = terminalRef.value?.querySelector('.xterm-viewport')
  if (viewportEl && viewportWheelHandler) {
    viewportEl.removeEventListener('wheel', viewportWheelHandler)
    viewportWheelHandler = null
  }
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', onDocumentClick)
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
  height: 100%;
  min-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.terminal {
  width: 100%;
  height: 100%;
  padding: 0;
  padding-bottom: 8px;
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

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: #2d2d30;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  min-width: 120px;
  padding: 4px 0;
  animation: fadeIn 0.15s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  color: #ffffff;
  font-size: 13px;
  transition: background-color 0.2s ease;
  gap: 8px;
}

.menu-item:hover {
  background-color: rgba(58, 134, 255, 0.2);
}

.menu-item.disabled {
  color: #6c6c6c;
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background-color: transparent;
}

.menu-divider {
  height: 1px;
  background-color: #3e3e42;
  margin: 4px 0;
}

.menu-item .el-icon {
  font-size: 14px;
  width: 16px;
}

.terminal-footer {
  flex-shrink: 0;
  background-color: #2d2d30;
  border-top: 1px solid #3e3e42;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: #909399;
  font-size: 12px;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-item .el-icon {
  font-size: 14px;
}

/* XTerm.js 样式调整 */
:deep(.xterm) {
  padding: 10px;
  position: relative;
}

:deep(.xterm-viewport) {
  background-color: #1e1e1e !important;
}

:deep(.xterm-screen) {
  background-color: #1e1e1e !important;
}

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

:deep(.xterm .xterm-selection) {
  background-color: rgba(58, 134, 255, 0.2) !important;
  border-radius: 2px;
  mix-blend-mode: screen;
}

:deep(.xterm) {
  padding: 0 !important;
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

:deep(.xterm-screen) {
  overflow: visible !important;
  width: 100% !important;
  height: 100% !important;
  background-color: #1e1e1e !important;
}

:deep(.xterm-scroll-area) {
  overflow: visible !important;
}

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
