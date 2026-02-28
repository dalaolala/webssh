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
              accept=".json" 
              style="display: none;" 
              @change="handleImportFile" 
            />
          </div>

          <div v-if="historyList.length > 0" class="history-tree">
            <el-tree
              :data="treeData"
              :props="treeProps"
              node-key="id"
              default-expand-all
              highlight-current
              @node-click="handleTreeNodeClick"
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
                  <el-button 
                    type="primary" 
                    :loading="connecting" 
                    @click="handleConnect"
                    style="width: 100%"
                  >
                    <el-icon><Connection /></el-icon>
                    连接
                  </el-button>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Connection, Delete, Close, Monitor, Lock, Folder, Upload, Download } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'
import { useAuthStore } from '@/stores/auth'

const HISTORY_KEY = 'webssh_quick_connect_history'
const MAX_HISTORY = 20

const router = useRouter()
const authStore = useAuthStore()

const emit = defineEmits(['connect'])

const connectForm = ref()
const fileInput = ref()
const connecting = ref(false)
const connectionError = ref('')
const savePassword = ref(false)
const historyList = ref([])

const form = reactive({
  name: '',
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

// ========== 树形数据 ==========

const treeProps = {
  children: 'children',
  label: 'label'
}

// 将 historyList 转换为树形结构，按主机地址分组
const treeData = computed(() => {
  const groups = {}
  
  historyList.value.forEach((item, index) => {
    const groupKey = item.host
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

  if (historyList.value.length > MAX_HISTORY) {
    historyList.value = historyList.value.slice(0, MAX_HISTORY)
  }

  persistHistory()
}

const fillFromHistory = (item) => {
  form.name = item.name || ''
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

// ========== 导出 / 导入 ==========

const exportHistory = () => {
  const data = JSON.stringify(historyList.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `webssh_quick_connect_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${historyList.value.length} 条连接记录`)
}

const triggerImport = () => {
  fileInput.value?.click()
}

const handleImportFile = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result)

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

      // 限制最大条数
      if (merged.length > MAX_HISTORY) {
        merged = merged.slice(0, MAX_HISTORY)
      }

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
      username: form.username
    }
    
    if (form.authType === 'password') {
      connectionInfo.password = form.password
    } else {
      connectionInfo.privateKey = form.privateKey
    }
    
    emit('connect', connectionInfo)
    connecting.value = false
    
  } catch (error) {
    connecting.value = false
    ElMessage.error('连接准备失败，请重试')
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
}

/* 左侧历史树 */
.history-aside {
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.aside-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
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
  gap: 6px;
  width: 100%;
  padding: 2px 0;
  font-size: 13px;
}

.tree-folder-icon {
  color: #e6a23c;
  font-size: 16px;
  flex-shrink: 0;
}

.tree-server-icon {
  color: #409eff;
  font-size: 14px;
  flex-shrink: 0;
}

.tree-node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}

.tree-node.is-leaf .tree-node-label {
  color: #606266;
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
}

/* Element Tree 深度覆盖 */
:deep(.el-tree-node__content) {
  height: 36px;
  padding-right: 8px !important;
}

:deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background-color: #ecf5ff;
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