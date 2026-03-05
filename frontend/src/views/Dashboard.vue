<template>
  <div class="dashboard-container">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="logo">WebSSH</h1>
        </div>
        <div class="header-right">
          <!-- 管理员功能入口 -->
          <el-button 
            v-if="authStore.user?.is_admin" 
            type="warning" 
            @click="$router.push('/user-management')"
            style="margin-right: 10px"
          >
            <el-icon><UserFilled /></el-icon>
            用户管理
          </el-button>
          
          <el-dropdown @command="handleUserCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ authStore.user?.email || '用户' }}
              <el-icon class="el-icon--right"><SwitchButton /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <!-- 管理员菜单项 -->
                <el-dropdown-item v-if="authStore.user?.is_admin" command="userManagement">
                  <el-icon><UserFilled /></el-icon>
                  用户管理
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  注销登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- 侧边栏 -->
      <el-aside width="300px" class="sidebar">
        <div class="sidebar-header">
          <h2>服务器管理</h2>
          <el-button type="primary" size="small" @click="showAddServerDialog = true">
            <el-icon><Plus /></el-icon>
            添加服务器
          </el-button>
        </div>
        
        <div class="server-search">
          <el-input
            v-model="searchQuery"
            placeholder="搜索服务器..."
            clearable
            :prefix-icon="Search"
          />
        </div>
        
        <div class="server-list">
          <el-tree
            :data="serverTree"
            node-key="id"
            :default-expanded-keys="expandedKeys"
            :expand-on-click-node="false"
            @node-click="handleServerClick"
            @node-dblclick="handleServerDblClick"
            @node-expand="handleNodeExpand"
            @node-collapse="handleNodeCollapse"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <span v-if="data.type === 'group'" class="group-node">
                  <el-icon><Folder /></el-icon>
                  {{ data.label }} ({{ data.children.length }})
                </span>
                <span v-else class="server-node">
                  <el-icon><Monitor /></el-icon>
                  <div class="server-info-wrapper">
                    <div class="server-name" @click="handleServerClick(data)">{{ data.label }}</div>
                    <div class="server-address">{{ data.host }}:{{ data.port }}</div>
                  </div>
                  <el-dropdown trigger="click" @command="handleServerAction(data.serverId, $event)" @click.stop>
                    <el-button class="server-actions" size="small" text @click.stop>
                      <el-icon><More /></el-icon>
                      <span class="action-text">操作</span>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="edit">
                          <el-icon><Edit /></el-icon>
                          编辑服务器
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" style="color: #f56c6c;">
                          <el-icon><Delete /></el-icon>
                          删除服务器
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </span>
              </div>
            </template>
          </el-tree>
        </div>
        
        <div class="quick-connect">
          <el-button type="success" @click="$router.push('/quick-connect')" style="width: 100%">
            <el-icon><Connection /></el-icon>
            快速连接
          </el-button>
        </div>
      </el-aside>
      
      <!-- 主内容区域 -->
      <el-main class="main-content">
        <div class="welcome-panel">
          <h1>欢迎使用 WebSSH</h1>
          <p>选择左侧的服务器开始连接，或使用快速连接功能</p>
          
          <div class="features">
            <el-row :gutter="20">
              <el-col :span="6">
                <div class="feature-card" @click="$router.push('/terminal-new')" style="cursor: pointer;">
                  <el-icon size="48" color="#409EFF"><Monitor /></el-icon>
                  <h3>Web 终端</h3>
                  <p>多页签终端管理，支持同时连接多个服务器</p>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="feature-card">
                  <el-icon size="48" color="#67C23A"><Lock /></el-icon>
                  <h3>安全加密</h3>
                  <p>AES-256加密存储，保障服务器信息安全</p>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="feature-card" @click="$router.push('/group-management')" style="cursor: pointer;">
                  <el-icon size="48" color="#E6A23C"><Folder /></el-icon>
                  <h3>分组管理</h3>
                  <p>支持服务器分组，方便管理和快速访问</p>
                </div>
              </el-col>
              <el-col :span="6">
                <div class="feature-card" @click="$router.push('/quick-connect')" style="cursor: pointer;">
                  <el-icon size="48" color="#F56C6C"><Connection /></el-icon>
                  <h3>快速连接</h3>
                  <p>服务器信息保存在本地，支持导入导出</p>
                </div>
              </el-col>
            </el-row>
          </div>

          <div class="quick-connect-only-banner" style="margin-top: 30px; text-align: center;">
            <el-button type="warning" plain size="large" @click="enableQuickConnectOnly">
              <el-icon><Connection /></el-icon>
              进入仅开启快速连接模式
            </el-button>
            <p style="color: #999; font-size: 13px; margin-top: 10px;">在此模式下，系统将隐藏分组、用户等其他功能页面，登录后直达快速连接面板。</p>
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- 添加服务器对话框 -->
    <el-dialog v-model="showAddServerDialog" title="添加服务器" width="500px">
      <ServerForm @success="handleServerAdded" @cancel="showAddServerDialog = false" />
    </el-dialog>

    <!-- 编辑服务器对话框 -->
    <el-dialog v-model="showEditServerDialog" :title="'编辑服务器 - ' + editingServerName" width="500px">
      <ServerForm 
        v-if="editingServerId" 
        :server-id="editingServerId" 
        @success="handleServerUpdated" 
        @cancel="showEditServerDialog = false" 
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Folder, Monitor, Connection, Lock, More, Edit, Delete, User, SwitchButton, UserFilled, Search } from '@element-plus/icons-vue'
import { useServersStore } from '@/stores/servers'
import { useAuthStore } from '@/stores/auth'
import ServerForm from '@/components/ServerForm.vue'

const router = useRouter()
const serversStore = useServersStore()
const authStore = useAuthStore()

const showAddServerDialog = ref(false)
const showEditServerDialog = ref(false)
const editingServerId = ref(null)
const editingServerName = ref('')
const searchQuery = ref('')

// 分组展开状态持久化 (sessionStorage)
const EXPANDED_KEYS_STORAGE_KEY = 'webssh_dashboard_expanded_keys'
const expandedKeys = ref(JSON.parse(sessionStorage.getItem(EXPANDED_KEYS_STORAGE_KEY) || '[]'))

// 监听分组展开
const handleNodeExpand = (data) => {
  if (data.type === 'group' && !expandedKeys.value.includes(data.id)) {
    expandedKeys.value.push(data.id)
    sessionStorage.setItem(EXPANDED_KEYS_STORAGE_KEY, JSON.stringify(expandedKeys.value))
  }
}

// 监听分组折叠
const handleNodeCollapse = (data) => {
  if (data.type === 'group') {
    expandedKeys.value = expandedKeys.value.filter(id => id !== data.id)
    sessionStorage.setItem(EXPANDED_KEYS_STORAGE_KEY, JSON.stringify(expandedKeys.value))
  }
}

// 计算服务器树形数据
const serverTree = computed(() => {
  const groups = {}
  
  let filteredServers = serversStore.servers
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filteredServers = filteredServers.filter(server => {
      return server.name?.toLowerCase().includes(q) || 
             server.host?.toLowerCase().includes(q) ||
             server.group_name?.toLowerCase().includes(q)
    })
  }
  
  // 按分组组织服务器
  filteredServers.forEach(server => {
    const groupName = server.group_name || 'Default'
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
  
  // 转换为树形结构
  return Object.keys(groups).map(groupName => ({
    id: `group-${groupName}`,
    label: groupName,
    type: 'group',
    children: groups[groupName]
  }))
})

// 处理服务器点击
const handleServerClick = (data, node) => {
  if (data.type === 'server') {
    router.push(`/terminal/${data.serverId}`)
  } else if (data.type === 'group' && node) {
    if (node.expanded) {
      node.expanded = false
      handleNodeCollapse(data)
    } else {
      node.expanded = true
      handleNodeExpand(data)
    }
  }
}

// 处理服务器双击
const handleServerDblClick = (data, node) => {
  if (data.type === 'group' && node) {
    if (node.expanded) {
      node.expanded = false
      handleNodeCollapse(data)
    } else {
      node.expanded = true
      handleNodeExpand(data)
    }
  }
}

// 处理服务器添加成功
const handleServerAdded = () => {
  showAddServerDialog.value = false
  ElMessage.success('服务器添加成功')
}

// 处理服务器更新成功
const handleServerUpdated = () => {
  showEditServerDialog.value = false
  editingServerId.value = null
  editingServerName.value = ''
  ElMessage.success('服务器更新成功')
}

// 处理服务器操作
const handleServerAction = async (serverId, command) => {
  const server = serversStore.servers.find(s => s.id === serverId)
  if (!server) return

  if (command === 'edit') {
    editingServerId.value = serverId
    editingServerName.value = server.name
    showEditServerDialog.value = true
  } else if (command === 'delete') {
    await handleDeleteServer(serverId, server.name)
  }
}

// 删除服务器
const handleDeleteServer = async (serverId, serverName) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除服务器 "${serverName}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const result = await serversStore.deleteServer(serverId)
    if (result.success) {
      ElMessage.success('服务器删除成功')
    } else {
      ElMessage.error(result.error)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 处理用户操作
const handleUserCommand = async (command) => {
  if (command === 'userManagement') {
    router.push('/user-management')
  } else if (command === 'logout') {
    try {
      await ElMessageBox.confirm(
        '确定要注销登录吗？',
        '注销确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      authStore.logout()
      ElMessage.success('注销成功')
      router.push('/login')
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('注销失败，请重试')
      }
    }
  }
}

// 仅快速连接模式
const enableQuickConnectOnly = () => {
  localStorage.setItem('webssh_quick_connect_only', 'true')
  ElMessage.success('已进入仅开启快速连接模式')
  router.push('/quick-connect')
}

onMounted(async () => {
  await serversStore.fetchServers()
})
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: white;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left .logo {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.user-info .el-icon {
  margin-right: 4px;
}

.main-container {
  height: calc(100vh - 60px);
}

.sidebar {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.sidebar-header h2 {
  margin: 0;
  color: #1c1c1e;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.server-search {
  margin-bottom: 20px;
}

.server-search :deep(.el-input__wrapper) {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  box-shadow: none !important;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
}

.server-search :deep(.el-input__wrapper.is-focus) {
  background-color: rgba(255, 255, 255, 1);
  border-color: #007AFF;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2) !important;
}

.server-search :deep(.el-input__inner) {
  color: #1c1c1e;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.server-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
}

/* 树形组件样式调整 */
:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  height: auto !important;
  padding: 4px 8px !important;
  margin-bottom: 2px !important;
  border-radius: 8px;
  transition: all 0.2s ease !important;
}

:deep(.el-tree-node__content:hover) {
  background-color: rgba(0, 0, 0, 0.06) !important;
}

:deep(.el-tree-node.is-current > .el-tree-node__content:has(.server-node)) {
  background-color: #007AFF !important;
  color: white;
}

:deep(.el-tree-node.is-current > .el-tree-node__content:has(.group-node)) {
  background-color: transparent !important;
}

:deep(.el-tree-node.is-current > .el-tree-node__content .server-node .server-name),
:deep(.el-tree-node.is-current > .el-tree-node__content .server-node .server-address) {
  color: white !important;
}

:deep(.el-tree-node.is-current > .el-tree-node__content .server-node .server-name:hover) {
  color: white !important;
}

:deep(.el-tree-node.is-current > .el-tree-node__content .server-actions) {
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.4);
  color: white;
}

:deep(.el-tree-node.is-current > .el-tree-node__content .server-actions:hover) {
  background-color: rgba(255, 255, 255, 0.2);
}

:deep(.el-tree-node) {
  margin-bottom: 0 !important;
}

.tree-node {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 2px 0;
  min-height: 48px;
  box-sizing: border-box;
}

.group-node {
  font-weight: 600;
  color: #1c1c1e;
  padding: 8px 4px;
  min-height: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
}

.server-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 6px;
  border-radius: 6px;
  min-height: auto;
  box-sizing: border-box;
}

.server-node:hover {
  background-color: transparent; /* rely on node content hover */
}

.server-info-wrapper {
  flex: 1;
  margin: 0 10px;
  min-width: 0;
}

.server-name {
  font-weight: 500;
  font-size: 14px;
  color: #1c1c1e;
  cursor: pointer;
  margin-bottom: 2px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.server-name:hover {
  color: #007AFF;
}

.server-address {
  font-size: 11px;
  color: rgba(28, 28, 30, 0.6);
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.server-actions {
  padding: 4px 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #1c1c1e;
  transition: all 0.2s;
  white-space: nowrap;
}

.server-actions:hover {
  border-color: #007AFF;
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.1);
}

.action-text {
  margin-left: 4px;
  font-size: 12px;
}

.quick-connect {
  margin-top: auto;
}

.main-content {
  padding: 40px;
  background-color: #f5f5f5;
}

.welcome-panel {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.welcome-panel h1 {
  color: #333;
  margin-bottom: 16px;
  font-size: 32px;
}

.welcome-panel p {
  color: #666;
  font-size: 16px;
  margin-bottom: 40px;
}

.features {
  margin-top: 40px;
}

.feature-card {
  padding: 30px 20px;
  text-align: center;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.feature-card h3 {
  margin: 16px 0 8px;
  color: #333;
}

.feature-card p {
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}
</style>