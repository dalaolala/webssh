<template>
  <div class="quick-connect-page">
    <el-container class="quick-connect-container">
      <!-- 主内容区域：左侧历史树 + 右侧表单 -->
      <el-container class="main-body">
        <!-- 左侧：连接历史树 -->
        <el-aside class="history-aside" width="300px">
          <div class="aside-header">
            <span class="aside-title">连接历史</span>
            <div class="aside-actions">
              <el-tooltip content="导入" placement="top">
                <el-button size="small" text @click="triggerImport">
                  <el-icon><Upload /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="导出" placement="top">
                <el-button 
                  size="small" 
                  text
                  :disabled="historyList.length === 0"
                  @click="exportHistory"
                >
                  <el-icon><Download /></el-icon>
                </el-button>
              </el-tooltip>
              <el-button 
                v-if="historyList.length > 0"
                type="danger" 
                size="small" 
                text 
                @click="clearAllHistory"
              >
                <el-icon><Delete /></el-icon>
                清空
              </el-button>
            </div>
            <input 
              ref="fileInput" 
              type="file" 
              accept=".json,.enc" 
              style="display: none;" 
              @change="handleImportFile" 
            />
          </div>

          <div class="history-search" v-if="historyList.length > 0">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索名称或IP..."
              clearable
              prefix-icon="Search"
              size="small"
            />
          </div>

          <div v-if="historyList.length > 0" class="history-tree">
            <el-tree
              ref="historyTreeRef"
              :data="treeData"
              :props="treeProps"
              node-key="id"
              :filter-node-method="filterNode"
              :default-expanded-keys="expandedHistoryKeys"
              highlight-current
              @node-click="handleTreeNodeClick"
              @node-expand="handleNodeExpand"
              @node-collapse="handleNodeCollapse"
            >
              <template #default="{ node, data }">
                <div class="tree-node" :class="{ 'is-leaf': data.isLeaf }">
                  <el-icon v-if="!data.isLeaf" class="tree-folder-icon"><Folder /></el-icon>
                  <el-icon v-else class="tree-server-icon"><Monitor /></el-icon>
                  <span class="tree-node-label">{{ node.label }}</span>
                  <div class="tree-node-actions" v-if="data.isLeaf">
                    <el-tag v-if="data.record?.hasSavedCredential" size="small" type="success" class="tree-tag">
                      <el-icon style="vertical-align: middle;"><Lock /></el-icon>
                    </el-tag>
                    <el-button 
                      type="danger" 
                      size="small" 
                      text 
                      circle
                      class="tree-delete-btn"
                      @click.stop="removeHistoryByRecord(data.record)"
                    >
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </div>
              </template>
            </el-tree>
          </div>

          <!-- 空状态 -->
          <div v-else class="history-empty">
            <el-empty description="暂无连接历史" :image-size="64" />
          </div>

        </el-aside>

        <!-- 右侧：连接表单 -->
        <el-main class="form-main">
          <div class="connect-form-container">
            <el-card class="connect-card">
              <template #header>
                <div class="card-header">
                  <h3>SSH连接信息</h3>
                  <p>输入服务器信息进行快速连接</p>
                </div>
              </template>

              <el-alert
                title="快速连接数据保存在本地浏览器中，更换设备或清除浏览器数据后将会丢失。"
                type="warning"
                show-icon
                :closable="false"
                style="margin-bottom: 20px;"
              />
              
              <el-form :model="form" :rules="rules" ref="connectForm" label-width="100px">
                <el-form-item label="服务器名称" prop="name">
                  <el-input v-model="form.name" placeholder="请输入服务器名称（可选）" />
                </el-form-item>

                <el-form-item label="所属分组" prop="group">
                  <el-select
                    v-model="form.group"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="请输入或选择分组名称（可选）"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in availableGroups"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="主机地址" prop="host">
                  <el-input v-model="form.host" placeholder="请输入IP地址或域名" />
                </el-form-item>
                
                <el-form-item label="端口" prop="port">
                  <el-input-number v-model="form.port" :min="1" :max="65535" />
                </el-form-item>
                
                <el-form-item label="用户名" prop="username">
                  <el-input v-model="form.username" placeholder="请输入SSH用户名" />
                </el-form-item>
                
                <el-form-item label="认证方式" prop="authType">
                  <el-radio-group v-model="form.authType">
                    <el-radio label="password">密码认证</el-radio>
                    <el-radio label="key">私钥认证</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <el-form-item v-if="form.authType === 'password'" label="密码" prop="password">
                  <el-input 
                    v-model="form.password" 
                    type="password" 
                    placeholder="请输入SSH密码" 
                    show-password 
                  />
                </el-form-item>
                
                <el-form-item v-if="form.authType === 'key'" label="私钥" prop="privateKey">
                  <el-input 
                    v-model="form.privateKey" 
                    type="textarea" 
                    :rows="6" 
                    placeholder="请输入SSH私钥内容" 
                  />
                </el-form-item>

                <!-- 保存密码复选框 -->
                <el-form-item label=" ">
                  <el-checkbox v-model="savePassword">
                    保存密码到本地（记住凭据）
                  </el-checkbox>
                </el-form-item>
                
                <el-form-item>
                  <el-button-group style="width: 100%; display: flex;">
                    <el-button 
                      type="success" 
                      :loading="connecting" 
                      @click="handleConnectSftp"
                      style="flex: 1;"
                    >
                      <el-icon><Folder /></el-icon>
                      连接 SFTP
                    </el-button>
                    <el-button 
                      type="primary" 
                      :loading="connecting" 
                      @click="handleConnect"
                      style="flex: 1;"
                    >
                      <el-icon><Connection /></el-icon>
                      连接 SSH
                    </el-button>
                  </el-button-group>
                </el-form-item>
              </el-form>
              
              <!-- 连接状态提示 -->
              <div v-if="connectionError" class="connection-error">
                <el-alert 
                  :title="connectionError" 
                  type="error" 
                  show-icon 
                  :closable="false"
                />
              </div>
              
              <div v-if="connecting" class="connecting-status">
                <el-alert 
                  title="正在连接..." 
                  type="info" 
                  show-icon 
                  :closable="false"
                />
              </div>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Connection, Delete, Close, Monitor, Lock, Folder, Upload, Download, Search } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'
import { useAuthStore } from '@/stores/auth'
import CryptoJS from 'crypto-js'

const HISTORY_KEY = 'webssh_quick_connect_history'

const router = useRouter()
const authStore = useAuthStore()

const emit = defineEmits(['connect'])

const connectForm = ref()
const fileInput = ref()
const connecting = ref(false)
const connectionError = ref('')
const savePassword = ref(false)
const historyList = ref([])

const searchKeyword = ref('')
const historyTreeRef = ref()

const form = reactive({
  name: '',
  group: '',
  host: '',
  port: 22,
  username: '',
  authType: 'password',
  password: '',
  privateKey: ''
})

const rules = {
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { 
      required: true, 
      message: '请输入密码', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.authType === 'password' && !value) {
          callback(new Error('请输入密码'))
        } else {
          callback()
        }
      }
    }
  ],
  privateKey: [
    { 
      required: true, 
      message: '请输入私钥', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.authType === 'key' && !value) {
          callback(new Error('请输入私钥'))
        } else {
          callback()
        }
      }
    }
  ]
}

// ========== 树形数据 & 分组下拉 ==========

// 提取历史记录中出现过的所有分组（去重）
const availableGroups = computed(() => {
  const groups = new Set()
  historyList.value.forEach(item => {
    if (item.group) {
      groups.add(item.group)
    }
  })
  return Array.from(groups).sort()
})

const treeProps = {
  children: 'children',
  label: 'label'
}

// 将 historyList 转换为树形结构，按分组名称分组
const treeData = computed(() => {
  const groups = {}
  
  historyList.value.forEach((item, index) => {
    const groupKey = item.group || '未分组'
    if (!groups[groupKey]) {
      groups[groupKey] = {
        id: `group-${groupKey}`,
        label: groupKey,
        isLeaf: false,
        children: []
      }
    }
    
    const displayName = item.name || `${item.username}@${item.host}:${item.port}`
    groups[groupKey].children.push({
      id: `item-${index}`,
      label: displayName,
      isLeaf: true,
      record: item,
      index: index
    })
  })
  
  return Object.values(groups)
})

const handleTreeNodeClick = (data) => {
  if (data.isLeaf && data.record) {
    fillFromHistory(data.record)
  }
}

// ========== 分组展开状态持久化 (sessionStorage) ==========
const EXPANDED_HISTORY_KEYS_KEY = 'webssh_quick_connect_expanded_keys'
const expandedHistoryKeys = ref(JSON.parse(sessionStorage.getItem(EXPANDED_HISTORY_KEYS_KEY) || '[]'))

const handleNodeExpand = (data) => {
  if (!data.isLeaf && !expandedHistoryKeys.value.includes(data.id)) {
    expandedHistoryKeys.value.push(data.id)
    sessionStorage.setItem(EXPANDED_HISTORY_KEYS_KEY, JSON.stringify(expandedHistoryKeys.value))
  }
}

const handleNodeCollapse = (data) => {
  if (!data.isLeaf) {
    expandedHistoryKeys.value = expandedHistoryKeys.value.filter(id => id !== data.id)
    sessionStorage.setItem(EXPANDED_HISTORY_KEYS_KEY, JSON.stringify(expandedHistoryKeys.value))
  }
}

// ========== 搜索过滤功能 ==========
const filterNode = (value, data) => {
  if (!value) return true
  if (data.type === 'group') return true // 保留分组节点，依靠子节点匹配来决定是否显示分组
  
  const searchLower = value.toLowerCase()
  const nameMatch = (data.record?.name || '').toLowerCase().includes(searchLower)
  const hostMatch = (data.record?.host || '').toLowerCase().includes(searchLower)
  
  return nameMatch || hostMatch
}

watch(searchKeyword, (val) => {
  historyTreeRef.value?.filter(val)
})

// ========== 历史记录管理 ==========

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    historyList.value = raw ? JSON.parse(raw) : []
  } catch {
    historyList.value = []
  }
}

const persistHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList.value))
}

const saveToHistory = () => {
  const record = {
    name: form.name || '',
    group: form.group || '',
    host: form.host,
    port: form.port,
    username: form.username,
    authType: form.authType,
    connectedAt: Date.now(),
    hasSavedCredential: savePassword.value
  }

  if (savePassword.value) {
    if (form.authType === 'password') {
      record.password = form.password
    } else {
      record.privateKey = form.privateKey
    }
  }

  const idx = historyList.value.findIndex(
    h => h.host === record.host && h.port === record.port && h.username === record.username
  )
  if (idx !== -1) {
    historyList.value.splice(idx, 1)
  }

  historyList.value.unshift(record)

  persistHistory()
}

const fillFromHistory = (item) => {
  form.name = item.name || ''
  form.group = item.group || ''
  form.host = item.host
  form.port = item.port
  form.username = item.username
  form.authType = item.authType

  if (item.hasSavedCredential) {
    savePassword.value = true
    if (item.authType === 'password') {
      form.password = item.password || ''
      form.privateKey = ''
    } else {
      form.privateKey = item.privateKey || ''
      form.password = ''
    }
  } else {
    savePassword.value = false
    form.password = ''
    form.privateKey = ''
  }

  ElMessage.success('已填充连接信息，请检查后点击连接')
}

const removeHistoryByRecord = (record) => {
  const idx = historyList.value.findIndex(
    h => h.host === record.host && h.port === record.port && h.username === record.username
  )
  if (idx !== -1) {
    historyList.value.splice(idx, 1)
    persistHistory()
    ElMessage.info('已删除')
  }
}

const clearAllHistory = () => {
  ElMessageBox.confirm('确定要清空所有连接历史吗？', '清空历史', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    historyList.value = []
    persistHistory()
    ElMessage.success('已清空所有历史记录')
  }).catch(() => {})
}

// ========== 导入与导出 ==========

const getEncryptionKey = () => {
  const email = authStore.user?.email || 'default'
  return `${email}2026webssh`
}

const exportHistory = () => {
  if (historyList.value.length === 0) {
    ElMessage.warning('没有历史记录可导出')
    return
  }

  const jsonStr = JSON.stringify(historyList.value, null, 2)
  const key = getEncryptionKey()
  // 对 JSON 字符串进行 AES 加密
  const encryptedData = CryptoJS.AES.encrypt(jsonStr, key).toString()

  const blob = new Blob([encryptedData], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `webssh_quick_connect_${new Date().toISOString().slice(0, 10)}.enc`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已加密导出 ${historyList.value.length} 条连接记录`)
}

const triggerImport = () => {
  fileInput.value?.click()
}

const handleImportFile = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const fileContent = e.target.result
      let key = getEncryptionKey()
      
      let jsonStr = ''
      try {
        const bytes = CryptoJS.AES.decrypt(fileContent, key)
        jsonStr = bytes.toString(CryptoJS.enc.Utf8)
        if (!jsonStr) throw new Error('Decryption empty')
      } catch (err) {
        // 第一轮使用当前用户邮箱解密失败，弹窗让用户输入导出时的邮箱
        try {
          const { value: inputEmail } = await ElMessageBox.prompt(
            '当前账号解密失败。如果这是其他账号导出的文件，请输入导出该文件时的账号邮箱：', 
            '需要提供原邮箱以解密', 
            {
              confirmButtonText: '确定解密',
              cancelButtonText: '取消',
              inputPattern: /[\w!#$%&'*+/=?^_`{|}~-]+(?:\.[\w!#$%&'*+/=?^_`{|}~-]+)*@(?:[\w](?:[\w-]*[\w])?\.)+[\w](?:[\w-]*[\w])?/,
              inputErrorMessage: '邮箱格式不正确'
            }
          )
          
          key = `${inputEmail}2026webssh`
          const newBytes = CryptoJS.AES.decrypt(fileContent, key)
          jsonStr = newBytes.toString(CryptoJS.enc.Utf8)
          
          if (!jsonStr) throw new Error('Decryption empty second try')
        } catch (promptErr) {
          if (promptErr !== 'cancel') {
            ElMessage.error('使用您提供的邮箱解密依然失败，文件可能已损坏或邮箱不正确')
          }
          event.target.value = ''
          return
        }
      }

      const imported = JSON.parse(jsonStr)

      if (!Array.isArray(imported)) {
        ElMessage.error('文件格式错误：需要 JSON 数组')
        return
      }

      // 验证每条记录必须有 host 和 username
      const valid = imported.filter(item => item.host && item.username)
      if (valid.length === 0) {
        ElMessage.error('未找到有效的连接记录')
        return
      }

      // 合并：按 host+port+username 去重，导入的覆盖旧的
      let merged = [...historyList.value]
      let addedCount = 0
      valid.forEach(item => {
        const idx = merged.findIndex(
          h => h.host === item.host && h.port === item.port && h.username === item.username
        )
        if (idx !== -1) {
          merged.splice(idx, 1)
        }
        addedCount++
        merged.unshift(item)
      })

      historyList.value = merged
      persistHistory()
      ElMessage.success(`成功导入 ${addedCount} 条连接记录`)
    } catch {
      ElMessage.error('文件解析失败，请确认是有效的 JSON 文件')
    }
  }
  reader.readAsText(file)

  // 清空 input 以便重复选择同一文件
  event.target.value = ''
}

// ========== 连接逻辑 ==========

const handleConnect = async () => {
  await submitConnection('terminal')
}

const handleConnectSftp = async () => {
  await submitConnection('sftp')
}

const submitConnection = async (mode) => {
  if (!connectForm.value) return
  
  try {
    const valid = await connectForm.value.validate()
    if (!valid) return
    
    if (!authStore.token) {
      ElMessage.error('请先登录')
      return
    }

    connecting.value = true
    connectionError.value = ''

    saveToHistory()
    
    const connectionInfo = {
      name: form.name || '',
      host: form.host,
      port: form.port,
      username: form.username,
      mode: mode // Add mode to connectionInfo
    }
    
    if (form.authType === 'password') {
      connectionInfo.password = form.password
    } else {
      connectionInfo.privateKey = form.privateKey
    }
    
    emit('connect', connectionInfo)
    
  } catch (error) {
    ElMessage.error('连接准备失败，请重试')
  } finally {
    connecting.value = false
  }
}

onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.quick-connect-page {
  height: 100%;
  background-color: #f0f2f5;
}

.quick-connect-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 主体布局 */
.main-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex; /* Ensure the children (aside and main) flow correctly */
}

/* 左侧历史树 */
.history-aside {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 8px 12px;
}

.aside-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.history-search {
  padding: 12px 4px 8px;
}

.history-search :deep(.el-input__wrapper) {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  box-shadow: none !important;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
}

.history-search :deep(.el-input__wrapper.is-focus) {
  background-color: rgba(255, 255, 255, 1);
  border-color: #007AFF;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2) !important;
}

.history-search :deep(.el-input__inner) {
  color: #1c1c1e;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.aside-title {
  font-size: 16px;
  font-weight: 600;
  color: #1c1c1e;
  letter-spacing: -0.5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.aside-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.history-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.history-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aside-tip {
  flex-shrink: 0;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
}

/* 树节点样式 */
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 6px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.tree-folder-icon {
  color: #1c1c1e;
  font-size: 16px;
  flex-shrink: 0;
}

.tree-server-icon {
  color: #007AFF;
  font-size: 14px;
  flex-shrink: 0;
}

.tree-node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1c1c1e;
  font-weight: 500;
}

.tree-node.is-leaf .tree-node-label {
  color: #1c1c1e;
  font-weight: normal;
}

.tree-node-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-node:hover .tree-node-actions {
  opacity: 1;
}

.tree-tag {
  transform: scale(0.85);
}

.tree-delete-btn {
  width: 20px !important;
  height: 20px !important;
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.4);
}

/* Element Tree 深度覆盖 */
:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  height: auto !important;
  padding: 4px 6px !important;
  margin-bottom: 2px !important;
  border-radius: 8px;
  transition: all 0.2s ease !important;
}

:deep(.el-tree-node__content:hover) {
  background-color: rgba(0, 0, 0, 0.06) !important;
}

/* Tree Selection Highlights */
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf)) {
  background-color: #007AFF !important;
  color: white;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .tree-node-label),
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .tree-server-icon) {
  color: white !important;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .tree-delete-btn:hover) {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

/* 右侧表单 */
.form-main {
  padding: 30px 40px;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.connect-form-container {
  width: 100%;
  max-width: 580px;
}

.connect-card {
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0 0 4px 0;
  color: #333;
}

.card-header p {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.connection-error,
.connecting-status {
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-body {
    flex-direction: column;
  }
  
  .history-aside {
    width: 100% !important;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .form-main {
    padding: 20px;
  }
}
</style>