<template>
  <div class="terminal-page">
    <el-container class="terminal-container">
      <!-- 顶部工具栏 -->
      <el-header class="terminal-header">
        <div class="header-left">
          <el-button @click="$router.back()" size="small">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="server-name">{{ currentServer?.name || '快速连接' }}</span>
          <span class="server-info">{{ currentServer?.host }}:{{ currentServer?.port }}</span>
        </div>
        
        <div class="header-right">
          <!-- SFTP文件管理按钮 -->
          <el-button 
            v-if="terminalStore.isConnected"
            size="small"
            :type="showSftp ? 'primary' : 'default'"
            @click="toggleSftpPanel"
          >
            <el-icon><Folder /></el-icon>
            {{ showSftp ? '隐藏文件' : '文件管理' }}
          </el-button>
          
          <el-button-group>
            <el-button 
              v-if="!terminalStore.isConnected && !terminalStore.isConnecting"
              type="primary" 
              size="small"
              @click="connectToServer"
            >
              <el-icon><Connection /></el-icon>
              连接
            </el-button>
            
            <el-button 
              v-if="terminalStore.isConnecting"
              type="warning" 
              size="small"
              :loading="true"
            >
              连接中...
            </el-button>
            
            <el-button 
              v-if="terminalStore.isConnected"
              type="danger" 
              size="small"
              @click="terminalStore.disconnect"
            >
              <el-icon><Close /></el-icon>
              断开
            </el-button>
          </el-button-group>
          
          <el-button size="small" @click="clearTerminal">
            <el-icon><Delete /></el-icon>
            清屏
          </el-button>
          <el-button size="small" @click="copySelected" class="copy-button">
            <el-icon><Document /></el-icon>
            复制选中
          </el-button>
          <el-button size="small" @click="pasteFromClipboard">
            <el-icon><Edit /></el-icon>
            粘贴剪贴板
          </el-button>
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
              <p>点击"连接"按钮开始SSH会话</p>
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
            {{ currentServer?.host }}:{{ currentServer?.port }}
          </span>
          <span class="status-item">
            <el-icon><User /></el-icon>
            {{ currentServer?.username }}
          </span>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { ArrowLeft, Connection, Close, Delete, Monitor, Folder, User, Document, Edit, DocumentCopy, DocumentAdd, Select } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import { useSftpStore } from '@/stores/sftp'
import SftpFileManager from '@/components/SftpFileManager.vue'

const route = useRoute()
const terminalStore = useTerminalStore()
const serversStore = useServersStore()
const authStore = useAuthStore()
const sftpStore = useSftpStore()

const terminalRef = ref()
const currentServer = ref(null)
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
let isComposing = false // 标记 IME 输入法是否正在组合输入中

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
    disableStdin: false, // 启用终端输入
    scrollback: 10000, // 滚动历史缓冲区
    convertEol: true, // 转换行结束符
    allowTransparency: false,
    tabStopWidth: 8,
    cursorStyle: 'block', // 光标样式
    bellStyle: 'sound', // 铃声样式
    allowProposedApi: true,
    windowsMode: true, // Windows兼容模式
    screenReaderMode: false, // 禁用屏幕阅读器模式，避免辅助输入框问题
    // 滚动条配置
    scrollOnUserInput: true, // 用户输入时自动滚动到底部
    scrollOnOutput: false, // 输出时不自动滚动，让用户手动控制
    scrollSensitivity: 3, // 滚动灵敏度
    smoothScrollDuration: 0, // 平滑滚动持续时间（0为禁用）
    fastScrollSensitivity: 5, // 快速滚动灵敏度
    fastScrollModifier: 'alt', // 快速滚动修饰键
    // 其他配置
    macOptionIsMeta: false, // Windows环境下使用标准行为
    macOptionClickForcesSelection: false,
    rightClickSelectsWord: false,
    rendererType: 'canvas', // 使用canvas渲染器以获得更好的性能
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  
  // 添加Web链接支持
  const webLinksAddon = new WebLinksAddon()
  term.loadAddon(webLinksAddon)
  
    if (terminalRef.value) {
      term.open(terminalRef.value)
      fitAddon.fit()
      
      // 聚焦终端
      term.focus()
      
      // ================================================================
      // 修复中文输入法（IME）渲染到终端顶部的 Bug
      // ----------------------------------------------------------------
      // 根本原因：xterm.js 内部 compositionHelper 监听了 helper textarea
      // 的 compositionupdate 事件，在 IME 选字过程中会直接向 xterm 的内部
      // buffer 写入候选字并渲染到 canvas 第0行（终端顶部）。
      //
      // 解决方案：
      // 1. 在「捕获阶段」（useCapture=true）监听 compositionupdate/
      //    compositionstart，调用 stopImmediatePropagation() 阻止 xterm
      //    内部监听器收到事件 → 候选字不会被写入 canvas。
      // 2. compositionend 时从 e.data 取出最终文字直接发给服务器，
      //    并清空 textarea，防止 xterm 的 onData 再次重复发送。
      // ================================================================
      const setupHelperTextarea = () => {
        const textarea = terminalRef.value?.querySelector('.xterm-helper-textarea')
        if (textarea && !textarea._imeFixed) {
          textarea._imeFixed = true // 防止重复绑定

          // 保留 textarea 在终端容器内（确保 IME 候选框能在屏幕上弹出）
          // 仅隐藏其视觉显示
          textarea.style.opacity = '0'
          textarea.style.color = 'transparent'
          textarea.style.position = 'absolute'
          textarea.style.bottom = '4px'
          textarea.style.left = '4px'
          textarea.style.width = '1px'
          textarea.style.height = '1px'
          textarea.style.zIndex = '1'
          textarea.style.caretColor = 'transparent'

          // 【核心修复】捕获阶段拦截 compositionstart，阻止 xterm 内部处理
          textarea.addEventListener('compositionstart', (e) => {
            isComposing = true
            e.stopImmediatePropagation() // 阻止 xterm 内部 compositionHelper 收到此事件
          }, true)

          // 【核心修复】捕获阶段拦截 compositionupdate，阻止 xterm 将候选字写入 canvas
          textarea.addEventListener('compositionupdate', (e) => {
            e.stopImmediatePropagation() // 阻止 xterm 内部 compositionHelper 渲染候选字
          }, true)

          // compositionend：取最终确认文字发给服务器，清空 textarea
          textarea.addEventListener('compositionend', (e) => {
            e.stopImmediatePropagation()
            isComposing = false
            const text = e.data
            if (text && terminalStore.isConnected) {
              terminalStore.sendInput(text)
            }
            // 清空 textarea 防止 xterm onData 再次重复发送
            Promise.resolve().then(() => { textarea.value = '' })
          }, true)
        }
      }
      
      // 初始设置
      setupHelperTextarea()
      
      // 监听DOM变化，确保 helper textarea 创建后及时处理
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            setupHelperTextarea()
          }
        })
      })
      
      observer.observe(terminalRef.value, { childList: true, subtree: true })
      
      // 处理终端输入 - 直接发送到服务器
      // IME 组合期间（isComposing === true）忽略 onData，最终文字由 compositionend 处理
      term.onData((data) => {
        if (isComposing) {
          return // IME 组合进行中，跳过，避免发送候选字
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
          // 移除之前的事件监听器
          if (viewportWheelHandler) {
            viewport.removeEventListener('wheel', viewportWheelHandler)
          }
          
          // 添加新的滚轮事件监听器 - 直接操作滚动条
          viewportWheelHandler = (event) => {
            event.preventDefault()
            const deltaY = event.deltaY
            const deltaMode = event.deltaMode
            
            // 根据滚轮方向和速度滚动终端
            if (deltaMode === 0) {
              // 像素模式 - 使用更平滑的滚动
              const scrollAmount = Math.sign(deltaY) * Math.ceil(Math.abs(deltaY) / 8)
              viewport.scrollTop += scrollAmount * 20 // 增加滚动距离
            } else if (deltaMode === 1) {
              // 行模式
              viewport.scrollTop += deltaY * 20
            } else {
              // 页面模式
              viewport.scrollTop += deltaY * viewport.clientHeight
            }
          }
          
          viewport.addEventListener('wheel', viewportWheelHandler, { passive: false })
          
          // 确保滚动条可以正常拖动
          viewport.style.overflowY = 'auto'
          viewport.style.overflowX = 'hidden'
        }
      }
      
      // 初始启用滚轮滚动
      enableWheelScroll()
      
      // 监听DOM变化，确保滚轮支持始终生效
      const wheelObserver = new MutationObserver(() => {
        enableWheelScroll()
      })
      wheelObserver.observe(terminalRef.value, { childList: true, subtree: true })
      
      // 添加容器级别的滚轮事件作为备用
      wheelHandler = (e) => {
        const viewport = terminalRef.value?.querySelector('.xterm-viewport')
        if (viewport) {
          e.preventDefault()
          // 直接操作滚动条位置
          viewport.scrollTop += e.deltaY
        }
      }
      terminalRef.value.addEventListener('wheel', wheelHandler, { passive: false })
    
    // 处理终端按键事件
    term.attachCustomKeyEventHandler((event) => {
      // 防止浏览器默认行为，但允许常用快捷键
      if ((event.ctrlKey || event.metaKey) && 
          !['c', 'v', 'a', 'z', 'x', 'y'].includes(event.key.toLowerCase())) {
        event.preventDefault()
      }
      return true
    })
    
    // 防止空格触发容器或页面滚动，保持滚动条跟随光标
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
          // 备用方案：允许浏览器默认粘贴行为
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

// 连接到服务器
const connectToServer = async () => {
  if (!authStore.token) {
    // 显示用户友好的认证错误提示
    if (term) {
      term.write('\r\n\x1b[31m未认证，请重新登录后重试\x1b[0m\r\n')
    }
    ElMessage.error('未认证，请重新登录')
    console.error('未认证')
    return
  }

  const serverId = route.params.serverId
  
  if (serverId) {
    // 获取服务器信息
    const result = await serversStore.getServerCredentials(serverId)
    if (result.success) {
      currentServer.value = result.data.server
      
      // 初始化Socket连接（如果尚未连接）
      if (!terminalStore.socket) {
        try {
          await terminalStore.connectSocket(authStore.token)
          console.log('Socket连接和认证成功')
        } catch (error) {
          console.error('Socket连接或认证失败:', error)
          if (term) {
            term.write(`\r\n\x1b[31mSocket连接失败: ${error.message}\x1b[0m\r\n`)
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

// 聚焦终端
const focusTerminal = () => {
  if (term) {
    term.focus()
  }
}

// 切换SFTP面板显示
const toggleSftpPanel = () => {
  showSftp.value = !showSftp.value
  
  // 延迟调整终端大小
  setTimeout(() => {
    handleResize()
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

// 检查是否有选中的文本
const hasSelection = () => {
  return term && term.getSelection() && term.getSelection().length > 0
}

// 从右键菜单复制
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

// 从右键菜单粘贴
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

// 从右键菜单全选
const selectAllFromContextMenu = () => {
  if (term) {
    term.selectAll()
    hideContextMenu()
  }
}

// 清屏功能
const clearTerminal = () => {
  // 清空终端状态
  resetConnectedState()
}

const copySelected = async () => {
  if (term) {
    const selection = term.getSelection()
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
  if (term) {
    term.reset()
    term.focus()
    // 连接提示
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

// 监听终端输出变化，让滚动条跟随光标到底部
watch(() => terminalStore.terminalOutput, (newOutput, oldOutput) => {
  if (term && terminalStore.isConnected && newOutput !== oldOutput) {
    const newData = newOutput.slice(oldOutput.length)
    if (newData) {
      term.write(newData)
      if (newData.includes('\x1b[H') && newData.includes('\x1b[2J')) {
        resetConnectedState()
      } else {
        // 仅在用户输入时滚动到底部，其他情况下保持当前位置
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
      // 连接成功时清空终端并聚焦
      term.clear()
      term.focus()
      
      // 延迟写入欢迎信息，确保终端准备好
      setTimeout(() => {
        term.write('\x1b[32mSSH连接已建立，可以开始输入命令\x1b[0m\r\n\r\n')
        
        // 确保光标可见，并将滚动条保持在顶部
        term.write('\x1b[?25h') // 显示光标
        
        // 强制将滚动条设置为顶部
        if (typeof term.scrollToTop === 'function') {
          term.scrollToTop()
        }
        
        // 直接操作DOM滚动条确保位置正确
        const viewport = terminalRef.value?.querySelector('.xterm-viewport')
        if (viewport) {
          initialScrollTop = 0 // 初始滚动位置设为顶部
          viewport.scrollTop = 0
          
          // 添加延迟确保滚动条位置设置生效
          setTimeout(() => {
            viewport.scrollTop = 0
          }, 50)
        }
      }, 100)
    } else if (!isConnected && wasConnected) {
      // 断开时显示断开信息
      term.write('\r\n\x1b[31mSSH连接已断开\x1b[0m\r\n')
      
      // 断开SFTP连接
      sftpStore.disconnectSftp()
      showSftp.value = false
    }
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
    
    // 发送终端大小到服务器
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
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 如果是服务器连接，自动连接
  if (route.params.serverId) {
    await connectToServer()
  }
})

onUnmounted(() => {
  // 清理资源
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
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  color: white;
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
  cursor: text;
  overflow: hidden; /* 终端容器本身不需要滚动 */
  position: relative;
  min-height: 400px;
  display: flex;
  flex-direction: column;
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
  flex-shrink: 0; /* 确保 footer 占据固定高度，不压缩也不覆盖终端 */
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