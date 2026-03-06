<template>
  <div class="terminal-new-page">
    <el-container class="terminal-new-container">
      <!-- 左侧服务器列表 -->
      <el-aside class="servers-sidebar" width="280px">
        <div class="sidebar-header">
          <h3>服务器列表</h3>
          <el-button 
            type="primary" 
            size="small" 
            @click="handleBackToDashboard"
          >
            <el-icon><Back /></el-icon>
            返回面板
          </el-button>
        </div>
        
        <!-- 搜索框 -->
        <div class="server-search">
          <el-input
            v-model="searchQuery"
            placeholder="搜索服务器..."
            clearable
            :prefix-icon="Search"
          />
        </div>
        
        <!-- 服务器树型结构 -->
        <div class="server-tree">
          <el-tree
            :data="serverTreeData"
            :props="treeProps"
            node-key="id"
            :default-expanded-keys="[]"
            :expand-on-click-node="false"
            :highlight-current="true"
            @node-click="handleTreeNodeClick"
            @node-dblclick="handleTreeNodeDblClick"
          >
            <template #default="{ node, data }">
              <div class="tree-node-content">
                <!-- 分组节点 -->
                <div v-if="data.type === 'group'" class="group-node">
                  <el-icon class="group-icon"><Folder /></el-icon>
                  <span class="group-name">{{ data.label }}</span>
                  <span class="server-count">{{ data.children?.length || 0 }}</span>
                </div>
                
                <!-- 服务器节点 -->
                <div v-else-if="data.type === 'server'" class="server-node">
                  <div class="server-info">
                    <div class="server-name">{{ data.label }}</div>
                    <div class="server-address">{{ data.host }}:{{ data.port }}</div>
                  </div>
                  <div class="server-status">
                    <el-icon 
                      v-if="getServerStatus(data.serverId) === 'connected'"
                      color="#67C23A"
                    >
                      <SuccessFilled />
                    </el-icon>
                    <el-icon 
                      v-else-if="getServerStatus(data.serverId) === 'connecting'"
                      color="#E6A23C"
                    >
                      <Loading />
                    </el-icon>
                    <el-icon 
                      v-else
                      color="#909399"
                    >
                      <CircleClose />
                    </el-icon>
                  </div>
                </div>
              </div>
            </template>
          </el-tree>
        </div>
      </el-aside>
      
      <!-- 右侧多页签终端区域 -->
      <el-main class="tabs-main">
        <div class="tabs-container">
          <!-- 页签栏 -->
          <div class="tabs-header">
            <div class="tabs-scroll">
              <div 
                v-for="tab in tabs" 
                :key="tab.id"
                class="tab-item"
                :class="{ active: activeTabId === tab.id }"
                @click="switchTab(tab.id)"
              >
                <span class="tab-title">{{ tab.title }}</span>
                <el-icon 
                  class="tab-close"
                  @click.stop="closeTab(tab.id)"
                >
                  <Close />
                </el-icon>
              </div>
            </div>
            
            <!-- 右侧常用命令按钮 -->
            <div class="header-actions-right">
              <div 
                v-if="tabs.length > 0"
                class="command-library-btn danger-btn"
                @click="closeAllTabs"
                title="强制关闭所有标签页"
              >
                <el-icon><Delete /></el-icon>
                <span>关闭全部</span>
              </div>
              <div 
                class="command-library-btn"
                @click="showCommands = true"
                title="常用命令库"
              >
                <el-icon><Tickets /></el-icon>
                <span>常用命令</span>
              </div>
            </div>
          </div>
          
          <!-- 终端内容区域 -->
          <div class="tabs-content">
            <div 
              v-for="tab in tabs" 
              :key="tab.id"
              class="tab-content"
              :class="{ active: activeTabId === tab.id }"
            >
              <!-- 终端组件 -->
              <div 
                v-if="tab.type === 'terminal'"
                class="terminal-wrapper"
              >
                <XtermTerminal
                  :ref="(el) => { if (el) terminalComponentRefs[tab.id] = el }"
                  class="terminal"
                  :is-connected="tab.connected"
                  :tab-id="tab.id"
                  @data="(data) => handleTerminalData(data, tab.id)"
                  @resize="(dim) => handleTerminalResize(dim, tab.id)"
                  @click="focusTerminal(tab.id)"
                />
                
                <!-- 连接状态提示 -->
                <div 
                  v-if="!tab.connected && !tab.connecting && !tab.error" 
                  class="connection-prompt"
                >
                  <div class="prompt-content">
                    <el-icon size="48" color="#909399"><Monitor /></el-icon>
                    <h3>准备连接</h3>
                    <p>点击左侧服务器开始SSH会话</p>
                  </div>
                </div>
                
                <ConnectingOverlay
                  :visible="tab.connecting"
                  :subtitle="tab.server ? `${tab.server.host}:${tab.server.port}` : ''"
                />
                
                <div 
                  v-if="tab.error" 
                  class="connection-error"
                >
                  <el-alert 
                    :title="tab.error" 
                    type="error" 
                    show-icon 
                    :closable="false"
                  />
                </div>
              </div>
              
              <!-- 快速连接页签 -->
              <div 
                v-else-if="tab.type === 'quick-connect'"
                class="quick-connect-tab"
              >
                <QuickConnect 
                  @connect="handleQuickConnectSubmit"
                />
              </div>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- 常用命令抽屉组件 -->
    <CommandLibrary v-model="showCommands" @command="injectCommand" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import XtermTerminal from '@/components/XtermTerminal.vue'
import { 
  Connection, 
  SuccessFilled, 
  Loading, 
  CircleClose, 
  Close, 
  Plus, 
  Monitor,
  Folder,
  Back,
  Tickets,
  Search
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTerminalStore } from '@/stores/terminal'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import QuickConnect from './QuickConnect.vue'
import CommandLibrary from '@/components/CommandLibrary.vue'
import ConnectingOverlay from '@/components/ConnectingOverlay.vue'
import { io } from 'socket.io-client'

const authStore = useAuthStore()
const terminalStore = useTerminalStore()
const serversStore = useServersStore()
const router = useRouter()

const terminalComponentRefs = ref({})
const tabs = ref([])
const activeTabId = ref(null)

// 搜索文本
const searchQuery = ref('')

// 常用命令显示控制
const showCommands = ref(false)

// 当前活动的终端页签
const activeTab = computed(() => {
  return tabs.value.find(tab => tab.id === activeTabId.value)
})

// 计算属性：树型结构数据
const serverTreeData = computed(() => {
  const groups = {}
  
  // 过滤服务器列表
  let filteredServers = serversStore.servers
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filteredServers = filteredServers.filter(server => {
      return server.name?.toLowerCase().includes(q) || 
             server.host?.toLowerCase().includes(q) ||
             server.group_name?.toLowerCase().includes(q)
    })
  }

  filteredServers.forEach(server => {
    const groupName = server.group_name || '默认分组'
    if (!groups[groupName]) {
      groups[groupName] = []
    }
    groups[groupName].push({
      id: `server-${server.id}`,
      label: server.name,
      host: server.host,
      port: server.port,
      type: 'server',
      serverId: server.id
    })
  })
  
  return Object.keys(groups).map(groupName => ({
    id: `group-${groupName}`,
    label: groupName,
    type: 'group',
    children: groups[groupName]
  }))
})

// 树型配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 注入命令（发射给当前活动的终端）
const injectCommand = (cmd) => {
  if (activeTab.value && activeTab.value.type === 'terminal' && activeTab.value.connected && activeTab.value.socket) {
    activeTab.value.socket.emit('ssh-input', cmd + '\n')
    focusTerminal(activeTab.value.id)
  } else {
    ElMessage.warning('当前没用连通的终端')
  }
}

// 获取服务器状态
const getServerStatus = (serverId) => {
  const tab = tabs.value.find(tab => tab.serverId === serverId)
  if (!tab) return 'disconnected'
  if (tab.connecting) return 'connecting'
  if (tab.connected) return 'connected'
  return 'disconnected'
}

// 创建新页签
const createNewTab = () => {
  const tabId = 'tab-' + Date.now()
  const newTab = {
    id: tabId,
    title: '新标签页',
    type: 'terminal',
    connected: false,
    connecting: false,
    error: null,
    socket: null
  }
  
  tabs.value.push(newTab)
  activeTabId.value = tabId
}

// 处理终端输入
const handleTerminalData = (data, tabId) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab || !tab.connected || !tab.socket) return
  tab.socket.emit('ssh-input', data)
}

// 处理终端尺寸改变
const handleTerminalResize = (dimensions, tabId) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab || !tab.connected || !tab.socket) return
  tab.socket.emit('ssh-resize', {
    cols: dimensions.cols,
    rows: dimensions.rows,
    width: dimensions.width,
    height: dimensions.height
  })
}

// 聚焦终端
const focusTerminal = (tabId) => {
  const component = terminalComponentRefs.value[tabId]
  if (component) {
    component.focus()
  }
}

// 处理树节点单击（直接创建新页签）
const handleTreeNodeClick = (data, node) => {
  if (data.type === 'server') {
    const server = serversStore.servers.find(s => s.id === data.serverId)
    if (server) {
      // 单击时直接创建新页签
      createNewTabForServer(server)
    }
  } else if (data.type === 'group' && node) {
    node.expanded = !node.expanded
  }
}

// 处理树节点双击（功能与单击相同，提供一致性）
const handleTreeNodeDblClick = (data, node) => {
  if (data.type === 'server') {
    const server = serversStore.servers.find(s => s.id === data.serverId)
    if (server) {
      // 双击时也创建新页签
      createNewTabForServer(server)
    }
  } else if (data.type === 'group' && node) {
    node.expanded = !node.expanded
  }
}

// 返回面板
const handleBackToDashboard = () => {
  router.push('/')
}

// 为服务器创建新页签（点击和双击操作都创建新页签）
const createNewTabForServer = async (server) => {
  // 生成唯一页签ID
  const tabId = 'server-' + server.id + '-' + Date.now()
  
  // 生成页签标题（如果已存在相同服务器的页签，添加序号）
  const existingTabsForServer = tabs.value.filter(tab => tab.serverId === server.id)
  let tabTitle = server.name
  if (existingTabsForServer.length > 0) {
    tabTitle = `${server.name} (${existingTabsForServer.length + 1})`
  }
  
  const newTab = {
    id: tabId,
    title: tabTitle,
    type: 'terminal',
    serverId: server.id,
    server: server,
    connected: false,
    connecting: false,
    error: null,
    terminal: null,
    fitAddon: null,
    socket: null,
    autoScroll: true,
    viewportWheelHandler: null
  }
  
  tabs.value.push(newTab)
  activeTabId.value = tabId
  
  // 延迟初始化连接
  nextTick(async () => {
    const reactiveTab = tabs.value.find(t => t.id === tabId)
    if (reactiveTab) {
      await performConnection(reactiveTab, server.id)
    }
  })
}

// 执行连接
const performConnection = async (tab, serverId) => {
  if (!authStore.token) {
    ElMessage.error('未认证，请重新登录')
    return
  }
  
  tab.connecting = true
  tab.error = null
  
  try {
    // 为当前标签创建独立的Socket连接
    tab.socket = io({
      auth: { token: authStore.token }
    })
    // 认证
    tab.socket.on('connect', () => {
      tab.socket.emit('authenticate', authStore.token)
    })
    tab.socket.on('authenticated', (data) => {
      if (data.success) {
        // 显示连接提示
        const tc = terminalComponentRefs.value[tab.id]
        if (tc) {
          tc.clear()
          tc.write('\x1b[33m正在连接服务器...\x1b[0m\r\n')
        }
        // 发起SSH连接
        tab.socket.emit('connect-ssh', serverId)
      } else {
        tab.connecting = false
        tab.error = '认证失败'
        const tc = terminalComponentRefs.value[tab.id]
        if (tc) tc.write('\r\n\x1b[31m认证失败\x1b[0m\r\n')
      }
    })
    // 连接成功
    tab.socket.on('ssh-connected', () => {
      tab.connected = true
      tab.connecting = false
      tab.error = null
      const tc = terminalComponentRefs.value[tab.id]
      if (tc) {
        tc.clear()
        tc.focus()
      }
    })
    // 终端输出
    tab.socket.on('ssh-data', (data) => {
      const output = typeof data === 'string' ? data : String(data)
      const tc = terminalComponentRefs.value[tab.id]
      if (tc) tc.write(output)
    })
    // 错误
    tab.socket.on('ssh-error', (data) => {
      tab.connecting = false
      tab.connected = false
      tab.error = data.error || '连接错误'
      const tc = terminalComponentRefs.value[tab.id]
      if (tc) tc.write(`\r\n\x1b[31m连接错误: ${tab.error}\x1b[0m\r\n`)
    })
    // 连接关闭
    tab.socket.on('ssh-closed', () => {
      tab.connected = false
      tab.connecting = false
      const tc = terminalComponentRefs.value[tab.id]
      if (tc) tc.write('\r\n\x1b[33m连接已关闭\x1b[0m\r\n')
    })
    // Socket断开
    tab.socket.on('disconnect', () => {
      tab.connected = false
      tab.connecting = false
    })
    // 超时处理
    setTimeout(() => {
      if (!tab.connected && !tab.error) {
        tab.connecting = false
        tab.error = '连接超时'
        const tc = terminalComponentRefs.value[tab.id]
        if (tc) tc.write('\r\n\x1b[31m连接超时\x1b[0m\r\n')
      }
    }, 30000)
    
  } catch (error) {
    tab.connecting = false
    tab.error = error.message
    const tc = terminalComponentRefs.value[tab.id]
    if (tc) tc.write(`\r\n\x1b[31m连接失败: ${error.message}\x1b[0m\r\n`)
  }
}

// 切换页签
const switchTab = (tabId) => {
  activeTabId.value = tabId
  const component = terminalComponentRefs.value[tabId]
  if (component) {
    nextTick(() => {
      component.focus()
    })
  }
}

// 关闭页签
const closeTab = async (tabId) => {
  if (tabs.value.length <= 1) {
    ElMessage.warning('至少保留一个标签页')
    return
  }
  
  const tab = tabs.value.find(t => t.id === tabId)
  if (tab && tab.connected) {
    try {
      await ElMessageBox.confirm(
        '当前标签页有活动的连接，确定要关闭吗？',
        '确认关闭',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }
  }
  
  // 断开连接
  if (tab && tab.connected) {
    if (tab.socket) {
      tab.socket.emit('disconnect-ssh')
      tab.socket.disconnect()
      tab.socket = null
    }
  }
  
  // 清理终端引用
  delete terminalComponentRefs.value[tabId]
  
  // 移除页签
  tabs.value = tabs.value.filter(t => t.id !== tabId)
  
  // 切换到相邻页签
  if (activeTabId.value === tabId) {
    const remainingTabs = tabs.value
    if (remainingTabs.length > 0) {
      activeTabId.value = remainingTabs[remainingTabs.length - 1].id
    } else {
      activeTabId.value = null
    }
  }
}

// 强制关闭所有页签
const closeAllTabs = async () => {
  if (tabs.value.length === 0) return
  
  const hasConnectedTabs = tabs.value.some(t => t.connected)
  if (hasConnectedTabs) {
    try {
      await ElMessageBox.confirm(
        '确定要强制关闭所有活动的会话标签页吗？未保存的工作将会丢失。',
        '强制断开所有连接',
        {
          confirmButtonText: '确定关闭',
          cancelButtonText: '取消',
          type: 'error'
        }
      )
    } catch {
      return
    }
  }
  
  // 遍历清理所有连接
  tabs.value.forEach(tab => {
    if (tab.connected && tab.socket) {
      tab.socket.emit('disconnect-ssh')
      tab.socket.disconnect()
      tab.socket = null
    }
    delete terminalComponentRefs.value[tab.id]
  })
  
  // 清空所有状态
  tabs.value = []
  activeTabId.value = null
  ElMessage.success('已强制关闭所有会话标签')
}


// 快速连接
const handleQuickConnect = () => {
  const tabId = 'quick-connect-' + Date.now()
  const newTab = {
    id: tabId,
    title: '快速连接',
    type: 'quick-connect'
  }
  
  tabs.value.push(newTab)
  activeTabId.value = tabId
}

// 处理快速连接提交
const handleQuickConnectSubmit = (connectionInfo) => {
  // 创建终端页签并连接
  const tabId = 'quick-' + Date.now()
  const newTab = {
    id: tabId,
    title: `快速连接 - ${connectionInfo.host}`,
    type: 'terminal',
    quickConnect: true,
    connectionInfo: connectionInfo,
    connected: false,
    connecting: false,
    error: null,
    terminal: null,
    fitAddon: null
  }
  tabs.value.push(newTab)
  activeTabId.value = tabId
  
  // 延迟初始化连接
  nextTick(async () => {
    const reactiveTab = tabs.value.find(t => t.id === tabId)
    if (reactiveTab) {
      await performQuickConnection(reactiveTab, connectionInfo)
    }
  })
}

// 执行快速连接
const performQuickConnection = async (tab, connectionInfo) => {
  if (!authStore.token) {
    ElMessage.error('未认证，请重新登录')
    return
  }
  
  tab.connecting = true
  tab.error = null
  
  try {
    // 初始化Socket连接
    if (!terminalStore.socket) {
      await terminalStore.connectSocket(authStore.token)
    }
    
    // 清空终端并显示连接信息
    const tc = terminalComponentRefs.value[tab.id]
    if (tc) {
      tc.clear()
      tc.write('\x1b[33m正在连接服务器...\x1b[0m\r\n')
    }
    
    // 快速连接
    await terminalStore.quickConnect(connectionInfo)
    
    // 监听连接状态变化
    const unwatch = watch(() => terminalStore.isConnected, (isConnected) => {
      if (isConnected) {
        tab.connected = true
        tab.connecting = false
        const tcomp = terminalComponentRefs.value[tab.id]
        if (tcomp) tcomp.clear()
        unwatch()
      }
    })
    
    // 监听错误
    const errorWatch = watch(() => terminalStore.connectionError, (error) => {
      if (error) {
        tab.connecting = false
        tab.error = error
        const tcomp = terminalComponentRefs.value[tab.id]
        if (tcomp) tcomp.write(`\r\n\x1b[31m连接错误: ${error}\x1b[0m\r\n`)
        errorWatch()
      }
    })
    
    // 监听终端输出
    const outputWatch = watch(() => terminalStore.terminalOutput, (newOutput, oldOutput) => {
      if (tab.connected) {
        const newData = newOutput.slice(oldOutput.length)
        if (newData) {
          const tcomp = terminalComponentRefs.value[tab.id]
          if (tcomp) tcomp.write(newData)
        }
      }
    })
    
    // 设置超时
    setTimeout(() => {
      if (!tab.connected && !tab.error) {
        tab.connecting = false
        tab.error = '连接超时'
        unwatch()
        errorWatch()
        outputWatch()
      }
    }, 30000)
    
  } catch (error) {
    tab.connecting = false
    tab.error = error.message
    const tc = terminalComponentRefs.value[tab.id]
    if (tc) tc.write(`\r\n\x1b[31m连接失败: ${error.message}\x1b[0m\r\n`)
  }
}

/* Replace window listener manually, kept as empty stub since component handles it */

onMounted(async () => {
  // 加载服务器列表
  await serversStore.fetchServers()
  
  // 创建初始页签
  createNewTab()
})

onUnmounted(() => {
  // 清理所有终端资源
  tabs.value.forEach(tab => {
    if (tab.socket) {
      tab.socket.emit('disconnect-ssh')
      tab.socket.disconnect()
      tab.socket = null
    }
  })
})
</script>

<style scoped>
.terminal-new-page {
  height: 100vh;
  background-color: #1e1e1e;
}

.terminal-new-container {
  height: 100%;
}

/* 左侧服务器列表样式 */
.servers-sidebar {
  background: linear-gradient(135deg, #252526 0%, #2d2d30 100%);
  border-right: 1px solid #3e3e42;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.05);
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(62, 62, 66, 0.6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1e1e1e 0%, #252526 100%);
  backdrop-filter: blur(10px);
}

.sidebar-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.server-search {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(62, 62, 66, 0.6);
  background: rgba(30, 30, 30, 0.4);
}

.server-search :deep(.el-input__wrapper) {
  background-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.server-search :deep(.el-input__inner) {
  color: #e0e0e0;
}

/* 树型结构样式 */
.server-tree {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

:deep(.el-tree) {
  background: transparent !important;
  color: #ffffff !important;
}

:deep(.el-tree-node) {
  margin-bottom: 0 !important;
}

:deep(.el-tree-node__content) {
  height: 40px !important;
  padding: 0 16px !important;
  margin-bottom: 0 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  background: rgba(37, 37, 38, 0.8) !important;
}

:deep(.el-tree-node__content:hover) {
  background: rgba(103, 194, 58, 0.1) !important;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(58, 134, 255, 0.2) !important;
}

:deep(.el-tree-node__expand-icon) {
  color: #909399 !important;
  font-size: 16px !important;
  transition: all 0.3s ease !important;
}

:deep(.el-tree-node__expand-icon:hover) {
  color: #ffffff !important;
}

:deep(.el-tree-node__expand-icon.is-leaf) {
  color: transparent !important;
}

/* 树节点内容样式 */
.tree-node-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}

.group-node {
  display: flex;
  align-items: center;
  width: 100%;
  color: #cccccc;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.group-icon {
  margin-right: 8px;
  color: #3a86ff !important;
  font-size: 16px;
}

.group-name {
  flex: 1;
  font-weight: 600;
}

.server-count {
  background: linear-gradient(135deg, #3a86ff 0%, #2575fc 100%);
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(58, 134, 255, 0.3);
}

.server-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 0;
}

.server-info {
  flex: 1;
  min-width: 0;
}

.server-name {
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.3px;
}

.server-address {
  color: #a0a0a0;
  font-size: 12px;
  font-weight: 400;
  opacity: 0.8;
}

.server-hint {
  color: #3a86ff;
  font-size: 10px;
  font-weight: 400;
  opacity: 0.7;
  margin-top: 2px;
}

.server-status {
  margin-left: 8px;
  flex-shrink: 0;
}

/* 右侧页签区域样式 */
.tabs-main {
  padding: 0 !important;
  background-color: #1e1e1e;
  overflow: hidden !important;
  display: flex;
  flex-direction: column;
}

.tabs-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.tabs-header {
  display: flex;
  align-items: center;
  background-color: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  height: 40px;
  min-height: 40px;
}

.tabs-scroll {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
}

.header-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background-color: transparent;
  margin-left: auto;
  z-index: 10;
}

.command-library-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.85); /* Mac white */
  font-size: 13px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 6px; /* Apple uses 6-8px for small buttons */
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  background: rgba(255, 255, 255, 0.08); /* Frosted effect base */
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px); /* Frosted glass */
  -webkit-backdrop-filter: blur(10px);
}

.command-library-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-0.5px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.1);
}

.command-library-btn:active {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(0);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.02);
}

.command-library-btn.danger-btn {
  background: rgba(255, 69, 58, 0.15); /* Apple Red translucent */
  color: #ff453a; /* iOS dark mode red */
  border: 1px solid rgba(255, 69, 58, 0.2);
}

.command-library-btn.danger-btn:hover {
  background: rgba(255, 69, 58, 0.85);
  color: #fff;
  border-color: rgba(255, 69, 58, 0.9);
  box-shadow: 0 2px 6px rgba(255, 69, 58, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.command-library-btn.danger-btn:active {
  background: rgba(255, 69, 58, 1);
  transform: translateY(0);
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.2);
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0 15px;
  height: 40px;
  background-color: #2d2d30;
  border-right: 1px solid #3e3e42;
  color: #909399;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  max-width: 200px;
  position: relative;
}

.tab-item:hover {
  background-color: #323233;
  color: #ffffff;
}

.tab-item.active {
  background-color: #1e1e1e;
  color: #ffffff;
  border-bottom: 2px solid #3a86ff;
}

.tab-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  margin-right: 8px;
}

.tab-close {
  font-size: 12px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  padding: 2px;
  border-radius: 2px;
}

.tab-close:hover {
  opacity: 1;
  background-color: rgba(255, 255, 255, 0.1);
}

.new-tab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  margin-left: 8px;
  margin-top: 6px;
  color: #a0a0a0;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

.new-tab-button:hover {
  background-color: #3a86ff;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(58, 134, 255, 0.3);
}

.tabs-content {
  flex: 1;
  height: calc(100% - 40px);
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.tab-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none;
}

.tab-content.active {
  display: block;
}

.terminal-wrapper {
  position: absolute;
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: 20px;
}

.terminal {
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  cursor: text;
  position: relative;
}

.connection-prompt,
.connection-status,
.connection-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
}

.prompt-content {
  color: #909399;
}

.prompt-content h3 {
  margin: 16px 0 8px;
  font-weight: normal;
}

.quick-connect-tab {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}


</style>
