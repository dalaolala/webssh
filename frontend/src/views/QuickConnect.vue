<template>
  <div class="quick-connect-page" :class="{ 'dark-theme': isDark }">
    <el-container class="quick-connect-container">
      <!-- 主内容区域：左侧历史树 + 右侧表单 -->
      <el-container class="main-body">
        <!-- 左侧：主机列表 -->
        <aside class="history-aside">
          <input
            ref="fileInput"
            type="file"
            accept=".json,.enc"
            style="display: none;"
            @change="handleImportFile"
          />

          <!-- 标题栏 -->
          <div class="aside-header">
            <span class="aside-title">主机列表</span>
            <div class="aside-header-actions">
              <el-tooltip content="导入" placement="bottom">
                <button class="icon-btn" @click="triggerImport">
                  <el-icon><Upload /></el-icon>
                </button>
              </el-tooltip>
              <el-tooltip content="导出" placement="bottom">
                <button class="icon-btn" :disabled="historyList.length === 0" @click="exportHistory">
                  <el-icon><Download /></el-icon>
                </button>
              </el-tooltip>
              <el-tooltip content="WebDAV 同步" placement="bottom">
                <button class="icon-btn" @click="openWebdavDialog">
                  <el-icon><Share /></el-icon>
                </button>
              </el-tooltip>
              <el-tooltip v-if="historyList.length > 0" content="清空列表" placement="bottom">
                <button class="icon-btn icon-btn--danger" @click="clearAllHistory">
                  <el-icon><Delete /></el-icon>
                </button>
              </el-tooltip>
            </div>
          </div>

          <!-- 搜索框 -->
          <div class="aside-search" v-if="historyList.length > 0">
            <div class="search-wrap">
              <el-icon class="search-icon"><Search /></el-icon>
              <input
                v-model="searchKeyword"
                class="search-input"
                placeholder="搜索名称或 IP…"
                @input="historyTreeRef?.filter(searchKeyword)"
              />
              <button v-if="searchKeyword" class="search-clear" @click="searchKeyword = ''; historyTreeRef?.filter('')">
                <el-icon><CircleClose /></el-icon>
              </button>
            </div>
          </div>

          <!-- 主机树 -->
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
                  <!-- 分组图标 -->
                  <span v-if="!data.isLeaf" class="node-icon node-icon--group">
                    <el-icon><Folder /></el-icon>
                  </span>
                  <!-- 服务器图标 -->
                  <span v-else class="node-icon node-icon--server">
                    <el-icon><Monitor /></el-icon>
                  </span>

                  <div class="node-body">
                    <span class="node-label">{{ node.label }}</span>
                    <span v-if="data.isLeaf && data.record" class="node-host">
                      {{ data.record.username }}@{{ data.record.host }}
                    </span>
                  </div>

                  <div class="node-badges" v-if="data.isLeaf">
                    <span v-if="data.record?.hasSavedCredential" class="badge-key" title="已保存凭据">
                      <el-icon><Lock /></el-icon>
                    </span>
                    <button
                      class="node-delete-btn"
                      @click.stop="removeHistoryByRecord(data.record)"
                      title="删除"
                    >
                      <el-icon><Close /></el-icon>
                    </button>
                  </div>
                </div>
              </template>
            </el-tree>
          </div>

          <!-- 空状态 -->
          <div v-else class="history-empty">
            <div class="empty-icon">
              <el-icon><Monitor /></el-icon>
            </div>
            <p class="empty-title">暂无主机</p>
            <p class="empty-desc">连接后自动保存到列表</p>
          </div>

        </aside>

        <!-- 右侧：连接表单 -->
        <el-main class="form-main">
          <div class="connect-form-container">

            <!-- 页面标题区 -->
            <div class="form-header">
              <div class="form-header-icon">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="form-header-text">
                <h2 class="form-title">SSH 连接</h2>
                <p class="form-subtitle">输入服务器信息以建立安全连接</p>
              </div>
            </div>

            <!-- 备份提示横幅 -->
            <div class="backup-banner">
              <el-icon class="banner-icon"><InfoFilled /></el-icon>
              <span>更换设备会导致数据丢失，请及时通过导出功能备份数据</span>
            </div>

            <el-form :model="form" :rules="rules" ref="connectForm" label-position="top">

              <!-- 分区：基本信息 -->
              <div class="form-section">
                <div class="section-title">基本信息</div>
                <div class="field-row two-col">
                  <div class="field-item">
                    <el-form-item label="服务器名称" prop="name">
                      <el-input v-model="form.name" placeholder="可选，如：生产服务器" />
                    </el-form-item>
                  </div>
                  <div class="field-item">
                    <el-form-item label="所属分组" prop="group">
                      <el-select
                        v-model="form.group"
                        filterable
                        allow-create
                        default-first-option
                        placeholder="可选，如：工作"
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
                  </div>
                </div>
              </div>

              <!-- 分区：连接参数 -->
              <div class="form-section">
                <div class="section-title">连接参数</div>
                <div class="field-row host-port-row">
                  <div class="field-item host-field">
                    <el-form-item label="主机地址" prop="host">
                      <el-input v-model="form.host" placeholder="IP 地址或域名" />
                    </el-form-item>
                  </div>
                  <div class="field-item port-field">
                    <el-form-item label="端口" prop="port">
                      <el-input-number
                        v-model="form.port"
                        :min="1"
                        :max="65535"
                        controls-position="right"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-item">
                    <el-form-item label="用户名" prop="username">
                      <el-input v-model="form.username" placeholder="SSH 用户名，如：root" autocomplete="off" />
                    </el-form-item>
                  </div>
                </div>
              </div>

              <!-- 分区：认证方式 -->
              <div class="form-section">
                <div class="section-title">认证方式</div>
                <div class="auth-type-switcher">
                  <button
                    type="button"
                    class="auth-tab"
                    :class="{ active: form.authType === 'password' }"
                    @click="form.authType = 'password'"
                  >
                    <el-icon><Lock /></el-icon>
                    密码认证
                  </button>
                  <button
                    type="button"
                    class="auth-tab"
                    :class="{ active: form.authType === 'key' }"
                    @click="form.authType = 'key'"
                  >
                    <el-icon><Key /></el-icon>
                    私钥认证
                  </button>
                </div>

                <div v-if="form.authType === 'password'" class="auth-content">
                  <el-form-item label="密码" prop="password">
                    <el-input
                      v-model="form.password"
                      type="password"
                      placeholder="SSH 登录密码"
                      show-password
                      autocomplete="new-password"
                    />
                  </el-form-item>
                </div>

                <div v-if="form.authType === 'key'" class="auth-content">
                  <el-form-item label="私钥内容" prop="privateKey">
                    <el-input
                      v-model="form.privateKey"
                      type="textarea"
                      :rows="6"
                      placeholder="粘贴 PEM 格式私钥，以 -----BEGIN ... PRIVATE KEY----- 开头"
                    />
                  </el-form-item>
                </div>

                <div class="save-credential-row">
                  <label class="save-credential-label">
                    <span class="custom-checkbox" :class="{ checked: savePassword }" @click="savePassword = !savePassword">
                      <el-icon v-if="savePassword"><Check /></el-icon>
                    </span>
                    <span class="save-text">记住凭据（保存到本地）</span>
                  </label>
                </div>
              </div>

              <!-- 连接错误提示 -->
              <div v-if="connectionError" class="error-banner">
                <el-icon><CircleCloseFilled /></el-icon>
                <span>{{ connectionError }}</span>
              </div>

              <!-- 操作按钮 -->
              <div class="action-row">
                <button
                  type="button"
                  class="action-btn sftp-btn"
                  :disabled="connecting"
                  @click="handleConnectSftp"
                >
                  <el-icon v-if="!connecting"><Folder /></el-icon>
                  <span class="btn-spinner" v-if="connecting"></span>
                  连接 SFTP
                </button>
                <button
                  type="button"
                  class="action-btn ssh-btn"
                  :disabled="connecting"
                  @click="handleConnect"
                >
                  <el-icon v-if="!connecting"><Connection /></el-icon>
                  <span class="btn-spinner" v-if="connecting"></span>
                  连接 SSH
                </button>
              </div>

            </el-form>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>

  <!-- WebDAV 同步组件 -->
  <WebdavSync
    ref="webdavSyncRef"
    :records="historyList"
    :record-count="historyList.length"
    @merged="onWebdavMerged"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Connection, Delete, Close, Monitor, Lock, Folder, Upload, Download, Search, Share, Key, Check, InfoFilled, CircleCloseFilled, CircleClose } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'
import { useThemeStore } from '@/stores/theme'
import CryptoJS from 'crypto-js'
import WebdavSync from '@/components/WebdavSync.vue'

const HISTORY_KEY = 'webssh_quick_connect_history'

const router = useRouter()
const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

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
    const groupKey = item.group || 'Default'
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
  // 优先使用用户自定义密钥
  const customKey = localStorage.getItem('webssh_export_key')
  if (customKey) {
    return customKey
  }
  // 如果没有设置自定义密钥，使用默认密钥
  return 'webssh-quick-connect-2026'
}

const setCustomKey = (key) => {
  localStorage.setItem('webssh_export_key', key)
}

const exportHistory = async () => {
  if (historyList.value.length === 0) {
    ElMessage.warning('没有历史记录可导出')
    return
  }

  // 每次导出都提示输入密钥
  try {
    const { value: inputKey, action } = await ElMessageBox.prompt(
      '请输入导出密钥（建议使用强密码）：\n\n⚠️ 请务必保存好此密钥，后续导入时需要用到！\n如果忘记密钥，将无法解密导出的文件。',
      '输入导出密钥',
      {
        confirmButtonText: '确认并导出',
        cancelButtonText: '取消导出',
        inputType: 'password',
        inputValidator: (value) => {
          if (!value || value.trim().length < 6) {
            return '密钥长度至少6位'
          }
          return true
        },
        inputErrorMessage: '密钥长度至少6位'
      }
    )
    
    if (action === 'confirm') {
      const key = inputKey.trim()
      
      // 继续导出流程
      const jsonStr = JSON.stringify(historyList.value, null, 2)
      // 对 JSON 字符串进行 AES 加密
      const encryptedData = CryptoJS.AES.encrypt(jsonStr, key).toString()

      const blob = new Blob([encryptedData], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // 生成 YYYYMMDD 格式的日期
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const dateStr = `${year}${month}${day}`
      
      a.download = `webssh_quick_connect_${dateStr}.enc`
      a.click()
      URL.revokeObjectURL(url)
      
      // 显示密钥提示
      ElMessage.success({
        message: `已加密导出 ${historyList.value.length} 条连接记录\n\n🔑 导出密钥：${key}\n⚠️ 请务必保存好此密钥！`,
        duration: 8000,
        showClose: true
      })
    } else {
      return // 用户取消导出
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('导出失败')
    }
    return
  }
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
      
      // 导入时弹出对话框提示输入密钥
      let key = ''
      try {
        const { value: inputKey } = await ElMessageBox.prompt(
          '请输入导出该文件时设置的密钥：', 
          '需要提供导出密钥以解密', 
          {
            confirmButtonText: '确定解密',
            cancelButtonText: '取消',
            inputType: 'password',
            inputPlaceholder: '请输入导出时设置的密钥',
            inputValidator: (value) => {
              if (!value || value.trim().length < 6) {
                return '密钥长度至少6位'
              }
              return true
            },
            inputErrorMessage: '密钥长度至少6位'
          }
        )
        
        key = inputKey.trim()
      } catch (promptErr) {
        if (promptErr !== 'cancel') {
          ElMessage.error('请输入有效的密钥')
        }
        event.target.value = ''
        return
      }
      
      // 尝试解密
      let jsonStr = ''
      try {
        const bytes = CryptoJS.AES.decrypt(fileContent, key)
        jsonStr = bytes.toString(CryptoJS.enc.Utf8)
        if (!jsonStr) throw new Error('解密失败，密钥可能不正确')
      } catch (err) {
        ElMessage.error('解密失败，请确认密钥是否正确')
        event.target.value = ''
        return
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
      ElMessage.error('文件解析失败，请确认是有效的加密文件')
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

// ========== WebDAV 同步 ==========

const webdavSyncRef = ref()

const openWebdavDialog = () => {
  webdavSyncRef.value?.open()
}

const onWebdavMerged = (mergedList) => {
  historyList.value = mergedList
  persistHistory()
}

onMounted(() => {
  loadHistory()
})
</script>

<style scoped>
.quick-connect-page {
  height: 100%;
  background-color: #f5f5f7;
  transition: background-color 0.3s ease;
}

.quick-connect-page.dark-theme {
  background-color: #000000;
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

/* 左侧主机列表 */
.history-aside {
  width: 260px;
  flex-shrink: 0;
  background: rgba(246, 246, 248, 0.96);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background 0.3s;
}

.dark-theme .history-aside {
  background: rgba(22, 22, 24, 0.96);
  border-right-color: rgba(255, 255, 255, 0.07);
}

/* 标题栏 */
.aside-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px 10px;
  flex-shrink: 0;
}

.aside-title {
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.4px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
}

.dark-theme .aside-title {
  color: #f5f5f7;
}

.aside-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

/* 图标按钮 */
.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 7px;
  color: #636366;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  padding: 0;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.07);
  color: #1c1c1e;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.icon-btn--danger:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
}

.dark-theme .icon-btn {
  color: #8e8e93;
}

.dark-theme .icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f5f5f7;
}

.dark-theme .icon-btn--danger:hover {
  background: rgba(255, 59, 48, 0.15);
  color: #FF453A;
}

/* 搜索框 */
.aside-search {
  padding: 0 10px 8px;
  flex-shrink: 0;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 9px;
  padding: 0 10px;
  height: 30px;
  transition: background 0.2s, box-shadow 0.2s;
}

.search-wrap:focus-within {
  background: #ffffff;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.35);
}

.dark-theme .search-wrap {
  background: rgba(255, 255, 255, 0.07);
}

.dark-theme .search-wrap:focus-within {
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.4);
}

.search-icon {
  font-size: 13px;
  color: #aeaeb2;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  color: #1c1c1e;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  min-width: 0;
}

.search-input::placeholder {
  color: #aeaeb2;
}

.dark-theme .search-input {
  color: #f5f5f7;
}

.dark-theme .search-input::placeholder {
  color: #636366;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #aeaeb2;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.15s;
}

.search-clear:hover {
  color: #636366;
}

/* 主机树容器 */
.history-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px 12px;
}

.history-tree::-webkit-scrollbar {
  width: 4px;
}

.history-tree::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.dark-theme .history-tree::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}

/* Element Tree 基础覆盖 */
:deep(.el-tree) {
  background: transparent;
  --el-tree-node-hover-bg-color: transparent;
}

:deep(.el-tree-node__content) {
  height: auto !important;
  padding: 0 !important;
  border-radius: 9px;
  transition: background 0.15s !important;
  margin-bottom: 1px;
}

:deep(.el-tree-node__content:hover) {
  background: rgba(0, 0, 0, 0.05) !important;
}

.dark-theme :deep(.el-tree-node__content:hover) {
  background: rgba(255, 255, 255, 0.07) !important;
}

:deep(.el-tree-node__expand-icon) {
  color: #aeaeb2;
  font-size: 12px;
  padding: 0 2px 0 4px;
}

.dark-theme :deep(.el-tree-node__expand-icon) {
  color: #636366;
}

/* 选中：叶节点 */
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf)) {
  background: #007AFF !important;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .node-label),
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .node-host),
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .node-icon--server) {
  color: #fff !important;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .badge-key) {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .node-delete-btn) {
  color: rgba(255,255,255,0.7);
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:has(.is-leaf) .node-delete-btn:hover) {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

/* 选中：分组节点 */
:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:not(:has(.is-leaf))) {
  background: rgba(0, 0, 0, 0.06) !important;
}

.dark-theme :deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content:not(:has(.is-leaf))) {
  background: rgba(255, 255, 255, 0.08) !important;
}

/* 树节点行 */
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 6px 6px 4px;
  min-width: 0;
}

.tree-node.is-leaf {
  padding: 5px 6px 5px 4px;
}

/* 图标容器 */
.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  flex-shrink: 0;
  font-size: 13px;
}

.node-icon--group {
  background: rgba(120, 120, 128, 0.12);
  color: #636366;
}

.node-icon--server {
  background: rgba(0, 122, 255, 0.12);
  color: #007AFF;
}

.dark-theme .node-icon--group {
  background: rgba(255, 255, 255, 0.1);
  color: #8e8e93;
}

.dark-theme .node-icon--server {
  background: rgba(0, 122, 255, 0.18);
  color: #409CFF;
}

/* 文字区 */
.node-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.node-label {
  font-size: 13px;
  font-weight: 500;
  color: #1c1c1e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.tree-node:not(.is-leaf) .node-label {
  font-size: 12px;
  font-weight: 600;
  color: #636366;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.node-host {
  font-size: 11px;
  color: #aeaeb2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  font-family: "SF Mono", "Monaco", Consolas, monospace;
}

.dark-theme .node-label {
  color: #e5e5ea;
}

.dark-theme .tree-node:not(.is-leaf) .node-label {
  color: #636366;
}

.dark-theme .node-host {
  color: #636366;
}

/* 右侧徽章区 */
.node-badges {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.tree-node:hover .node-badges {
  opacity: 1;
}

.badge-key {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: rgba(52, 199, 89, 0.12);
  color: #34C759;
  font-size: 10px;
}

.dark-theme .badge-key {
  background: rgba(52, 199, 89, 0.15);
  color: #30D158;
}

.node-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #aeaeb2;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  padding: 0;
}

.node-delete-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #FF3B30;
}

.dark-theme .node-delete-btn {
  color: #636366;
}

.dark-theme .node-delete-btn:hover {
  background: rgba(255, 69, 58, 0.15);
  color: #FF453A;
}

/* 空状态 */
.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-bottom: 20px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #c7c7cc;
  margin-bottom: 4px;
}

.dark-theme .empty-icon {
  background: rgba(255, 255, 255, 0.06);
  color: #48484a;
}

.empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #3c3c43;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.empty-desc {
  margin: 0;
  font-size: 12px;
  color: #aeaeb2;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.dark-theme .empty-title {
  color: #8e8e93;
}

.dark-theme .empty-desc {
  color: #48484a;
}

/* 右侧表单 */
.form-main {
  padding: 0;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #f2f2f7;
  transition: background 0.3s;
}

.dark-theme .form-main {
  background: #000000;
}

.connect-form-container {
  width: 100%;
  max-width: 600px;
  padding: 20px 28px 32px;
}

/* 页面标题 */
.form-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.form-header-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #007AFF 0%, #0055CC 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 17px;
  flex-shrink: 0;
  box-shadow: 0 3px 8px rgba(0, 122, 255, 0.28);
}

.form-title {
  margin: 0 0 1px;
  font-size: 18px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.4px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
}

.form-subtitle {
  margin: 0;
  font-size: 12px;
  color: #86868b;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.dark-theme .form-title { color: #f5f5f7; }
.dark-theme .form-subtitle { color: #636366; }

/* 备份提示横幅 */
.backup-banner {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  background: rgba(255, 159, 10, 0.1);
  border: 1px solid rgba(255, 159, 10, 0.25);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #b86e00;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  line-height: 1.4;
}

.backup-banner .banner-icon {
  font-size: 13px;
  flex-shrink: 0;
  color: #FF9F0A;
}

.dark-theme .backup-banner {
  background: rgba(255, 159, 10, 0.08);
  border-color: rgba(255, 159, 10, 0.2);
  color: #FF9F0A;
}

/* 分区卡片 */
.form-section {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 16px 4px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
  transition: background 0.3s, box-shadow 0.3s;
}

.dark-theme .form-section {
  background: #1c1c1e;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06);
}

.section-title {
  font-size: 10.5px;
  font-weight: 600;
  color: #86868b;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  margin-bottom: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.dark-theme .section-title { color: #636366; }

/* 字段行布局 */
.field-row {
  display: flex;
  gap: 10px;
}

.field-row.two-col .field-item {
  flex: 1;
  min-width: 0;
}

.field-row.host-port-row .host-field {
  flex: 1;
  min-width: 0;
}

.field-row.host-port-row .port-field {
  width: 110px;
  flex-shrink: 0;
}

.field-item {
  flex: 1;
  min-width: 0;
}

/* el-form-item label 覆盖 */
:deep(.el-form-item) {
  margin-bottom: 12px;
}

:deep(.el-form-item.is-error) {
  margin-bottom: 4px;
}

:deep(.el-form-item__label) {
  font-size: 11.5px;
  font-weight: 500;
  color: #636366;
  padding-bottom: 3px;
  line-height: 1.3;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.dark-theme :deep(.el-form-item__label) {
  color: #8e8e93;
}

/* 通用输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 8px;
  border: 1.5px solid rgba(0,0,0,0.1);
  box-shadow: none !important;
  background: #f9f9fb;
  transition: all 0.2s ease;
  padding: 0 10px;
}

:deep(.el-input__wrapper:hover) {
  border-color: rgba(0,0,0,0.2);
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #007AFF !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12) !important;
}

:deep(.el-input__inner) {
  font-size: 13.5px;
  height: 32px;
  color: #1c1c1e;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__wrapper) {
  border-radius: 8px;
}

/* Textarea */
:deep(.el-textarea__inner) {
  border-radius: 8px;
  border: 1.5px solid rgba(0,0,0,0.1);
  box-shadow: none !important;
  background: #f9f9fb;
  font-size: 12.5px;
  font-family: "SF Mono", "Monaco", "Menlo", Consolas, monospace;
  color: #1c1c1e;
  resize: vertical;
  transition: all 0.2s ease;
  padding: 8px 10px;
}

:deep(.el-textarea__inner:hover) {
  border-color: rgba(0,0,0,0.2);
}

:deep(.el-textarea__inner:focus) {
  border-color: #007AFF !important;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12) !important;
  outline: none;
}

/* Select 下拉 */
:deep(.el-select__wrapper) {
  border-radius: 8px;
  border: 1.5px solid rgba(0,0,0,0.1);
  box-shadow: none !important;
  background: #f9f9fb;
  height: auto;
  min-height: 34px;
  transition: all 0.2s ease;
}

:deep(.el-select__wrapper:hover) {
  border-color: rgba(0,0,0,0.2);
}

:deep(.el-select__wrapper.is-focused) {
  border-color: #007AFF !important;
  background: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12) !important;
}

:deep(.el-select__selected-item) {
  font-size: 13.5px;
  color: #1c1c1e;
}

:deep(.el-select__placeholder) {
  font-size: 13.5px;
  color: #c7c7cc;
}

/* 认证方式切换 */
.auth-type-switcher {
  display: flex;
  gap: 0;
  background: rgba(0,0,0,0.05);
  border-radius: 9px;
  padding: 3px;
  margin-bottom: 12px;
}

.dark-theme .auth-type-switcher {
  background: rgba(255,255,255,0.06);
}

.auth-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #636366;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.auth-tab.active {
  background: #ffffff;
  color: #1c1c1e;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
}

.dark-theme .auth-tab {
  color: #8e8e93;
}

.dark-theme .auth-tab.active {
  background: #2c2c2e;
  color: #f5f5f7;
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
}

.auth-content {
  margin-top: 2px;
}

/* 记住凭据 */
.save-credential-row {
  padding-bottom: 4px;
  margin-bottom: 2px;
}

.save-credential-label {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid rgba(0,0,0,0.2);
  background: #f9f9fb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.custom-checkbox.checked {
  background: #007AFF;
  border-color: #007AFF;
}

.dark-theme .custom-checkbox {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.06);
}

.dark-theme .custom-checkbox.checked {
  background: #007AFF;
  border-color: #007AFF;
}

.save-text {
  font-size: 13px;
  color: #48484a;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

.dark-theme .save-text { color: #8e8e93; }

/* 错误横幅 */
.error-banner {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  background: rgba(255, 59, 48, 0.08);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: 8px;
  margin-bottom: 10px;
  font-size: 12.5px;
  color: #FF3B30;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
}

/* 操作按钮行 */
.action-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 18px;
  height: 40px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  letter-spacing: -0.2px;
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sftp-btn {
  background: rgba(52, 199, 89, 0.12);
  color: #34C759;
  border: 1.5px solid rgba(52, 199, 89, 0.25);
}

.sftp-btn:not(:disabled):hover {
  background: rgba(52, 199, 89, 0.2);
  border-color: rgba(52, 199, 89, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 199, 89, 0.2);
}

.sftp-btn:not(:disabled):active {
  transform: translateY(0);
  box-shadow: none;
}

.ssh-btn {
  background: #007AFF;
  color: #ffffff;
  border: 1.5px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
}

.ssh-btn:not(:disabled):hover {
  background: #0066d6;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 122, 255, 0.4);
}

.ssh-btn:not(:disabled):active {
  transform: translateY(0);
  background: #005cc8;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.3);
}

.dark-theme .sftp-btn {
  background: rgba(52, 199, 89, 0.1);
  border-color: rgba(52, 199, 89, 0.2);
}

/* 按钮旋转动画 */
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.sftp-btn .btn-spinner {
  border-color: rgba(52, 199, 89, 0.3);
  border-top-color: #34C759;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 暗黑主题覆盖 */
.dark-theme :deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
}

.dark-theme :deep(.el-input__wrapper:hover) {
  border-color: rgba(255,255,255,0.2);
}

.dark-theme :deep(.el-input__wrapper.is-focus) {
  background: rgba(255,255,255,0.1) !important;
  border-color: #007AFF !important;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15) !important;
}

.dark-theme :deep(.el-input__inner) {
  color: #f5f5f7;
  background: transparent !important;
}

.dark-theme :deep(.el-textarea__inner) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
  color: #f5f5f7;
}

.dark-theme :deep(.el-textarea__inner:focus) {
  background: rgba(255,255,255,0.1);
  border-color: #007AFF !important;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15) !important;
}

.dark-theme :deep(.el-select__wrapper) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
}

.dark-theme :deep(.el-select__wrapper.is-focused) {
  background: rgba(255,255,255,0.1) !important;
  border-color: #007AFF !important;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15) !important;
}

.dark-theme :deep(.el-select__selected-item) {
  color: #f5f5f7;
}

.dark-theme :deep(.el-select__placeholder) {
  color: #48484a;
}

.dark-theme :deep(.el-input-number__decrease),
.dark-theme :deep(.el-input-number__increase) {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
  color: #f5f5f7;
}

.dark-theme :deep(.el-input-number__decrease:hover),
.dark-theme :deep(.el-input-number__increase:hover) {
  background: rgba(255,255,255,0.12);
}

.dark-theme :deep(.el-input__suffix) {
  color: #636366;
}

/* Select 下拉弹出层 */
:deep(.el-select__popper) {
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  overflow: hidden;
}

.dark-theme :deep(.el-select__popper) {
  background: #1c1c1e;
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}

.dark-theme :deep(.el-select-dropdown__item) {
  color: #f5f5f7;
}

.dark-theme :deep(.el-select-dropdown__item:hover) {
  background: rgba(255,255,255,0.06);
}

.dark-theme :deep(.el-select-dropdown__item.is-selected) {
  background: rgba(0,122,255,0.12);
  color: #007AFF;
}

/* 校验错误样式覆盖 */
:deep(.el-form-item.is-error .el-input__wrapper) {
  border-color: #FF3B30 !important;
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1) !important;
}

:deep(.el-form-item.is-error .el-textarea__inner) {
  border-color: #FF3B30 !important;
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1) !important;
}

:deep(.el-form-item__error) {
  position: static;
  font-size: 11.5px;
  color: #FF3B30;
  margin-top: 4px;
  padding-top: 0;
  line-height: 1.3;
}

/* 响应式 */
@media (max-width: 768px) {
  .connect-form-container {
    padding: 16px 14px 24px;
  }
  
  .field-row.two-col {
    flex-direction: column;
    gap: 0;
  }
  
  .field-row.host-port-row {
    flex-direction: column;
    gap: 0;
  }
  
  .field-row.host-port-row .port-field {
    width: 100%;
  }
  
  .action-row {
    flex-direction: column;
  }
}
</style>