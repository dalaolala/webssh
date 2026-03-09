<template>
  <el-dialog
    v-model="visible"
    title="WebDAV 同步"
    width="500px"
    :close-on-click-modal="false"
    @open="onOpen"
  >
    <el-tabs v-model="activeTab">
      <!-- 配置 Tab -->
      <el-tab-pane label="配置" name="config">
        <el-form :model="config" label-width="90px" style="margin-top: 8px;">
          <el-form-item label="服务器地址">
            <el-input
              v-model="config.url"
              placeholder="例：https://dav.example.com/dav/servers.enc"
            />
            <div class="form-tip">完整的文件路径 URL，如 https://dav.box.com/dav/webssh.enc</div>
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="config.username" placeholder="WebDAV 用户名（可选）" autocomplete="off" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input
              v-model="config.password"
              type="password"
              placeholder="WebDAV 密码（可选）"
              show-password
              autocomplete="new-password"
            />
          </el-form-item>
          <el-form-item label="加密密钥">
            <el-input
              v-model="config.encryptKey"
              type="password"
              placeholder="用于加密同步文件（至少6位）"
              show-password
            />
            <div class="form-tip">文件将使用此密钥加密后存储到 WebDAV，请妥善保管</div>
          </el-form-item>
        </el-form>
        <div class="config-actions">
          <el-button size="small" :loading="testing" @click="testConnection">
            测试连接
          </el-button>
          <el-button size="small" type="primary" @click="saveConfig">
            保存配置
          </el-button>
        </div>
      </el-tab-pane>

      <!-- 同步 Tab -->
      <el-tab-pane label="同步" name="sync">
        <div class="sync-area">
          <div class="sync-info" v-if="config.url">
            <el-icon><Link /></el-icon>
            <span>{{ config.url }}</span>
          </div>
          <div class="sync-info warning" v-else>
            <el-icon><Warning /></el-icon>
            <span>请先在"配置"标签页设置 WebDAV 地址</span>
          </div>

          <div class="sync-actions">
            <el-card class="action-card" shadow="never">
              <div class="action-content">
                <div class="action-icon upload-icon">
                  <el-icon :size="28"><Upload /></el-icon>
                </div>
                <div class="action-text">
                  <div class="action-title">上传到 WebDAV</div>
                  <div class="action-desc">将本地 {{ recordCount }} 条服务器记录加密后上传</div>
                </div>
                <el-button
                  type="primary"
                  :loading="uploading"
                  :disabled="!config.url || recordCount === 0"
                  @click="upload"
                >
                  上传
                </el-button>
              </div>
            </el-card>

            <el-card class="action-card" shadow="never">
              <div class="action-content">
                <div class="action-icon download-icon">
                  <el-icon :size="28"><Download /></el-icon>
                </div>
                <div class="action-text">
                  <div class="action-title">从 WebDAV 下载</div>
                  <div class="action-desc">从 WebDAV 下载并合并到本地历史记录</div>
                </div>
                <el-button
                  :loading="downloading"
                  :disabled="!config.url"
                  @click="download"
                >
                  下载
                </el-button>
              </div>
            </el-card>
          </div>

          <div class="last-sync" v-if="lastSync">
            <el-icon><Clock /></el-icon>
            上次同步：{{ lastSync }}
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download, Link, Warning, Clock } from '@element-plus/icons-vue'
import CryptoJS from 'crypto-js'

// ========== Props & Emits ==========

const props = defineProps({
  // 当前本地服务器列表（用于上传），数组
  records: {
    type: Array,
    default: () => []
  },
  // 计算属性：记录条数（避免深拷贝响应性问题）
  recordCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  // 下载合并后触发，payload: 合并后的完整记录数组
  'merged'
])

// ========== 对话框控制（通过 defineExpose 暴露 open 方法） ==========

const visible = ref(false)

const open = () => {
  loadConfig()
  visible.value = true
  activeTab.value = config.url ? 'sync' : 'config'
}

defineExpose({ open })

// ========== 配置持久化 ==========

const CONFIG_KEY = 'webssh_webdav_config'
const LAST_SYNC_KEY = 'webssh_webdav_last_sync'

const activeTab = ref('config')
const testing = ref(false)
const uploading = ref(false)
const downloading = ref(false)
const lastSync = ref('')

const config = reactive({
  url: '',
  username: '',
  password: '',
  encryptKey: ''
})

const loadConfig = () => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      config.url = saved.url || ''
      config.username = saved.username || ''
      config.password = saved.password || ''
      config.encryptKey = saved.encryptKey || ''
    }
    lastSync.value = localStorage.getItem(LAST_SYNC_KEY) || ''
  } catch {
    // ignore
  }
}

const saveConfig = () => {
  if (!config.url) {
    ElMessage.warning('请填写 WebDAV 服务器地址')
    return
  }
  if (config.encryptKey && config.encryptKey.length < 6) {
    ElMessage.warning('加密密钥至少需要 6 位')
    return
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify({
    url: config.url,
    username: config.username,
    password: config.password,
    encryptKey: config.encryptKey
  }))
  ElMessage.success('配置已保存')
}

const onOpen = () => {
  loadConfig()
}

// ========== 测试连接 ==========

const testConnection = async () => {
  if (!config.url) {
    ElMessage.warning('请先填写 WebDAV 服务器地址')
    return
  }
  testing.value = true
  try {
    const res = await fetch('/api/webdav/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: config.url, username: config.username, password: config.password })
    })
    const result = await res.json()
    result.success ? ElMessage.success('连接测试成功！') : ElMessage.error(result.message || '连接失败')
  } catch (e) {
    ElMessage.error('请求失败：' + e.message)
  } finally {
    testing.value = false
  }
}

// ========== 上传 ==========

const upload = async () => {
  if (!config.url) { ElMessage.warning('请先配置 WebDAV 地址'); return }
  if (props.recordCount === 0) { ElMessage.warning('没有服务器记录可同步'); return }

  let encryptKey = config.encryptKey
  if (!encryptKey) {
    try {
      const { value } = await ElMessageBox.prompt(
        '请输入加密密钥（至少6位），用于保护 WebDAV 上的文件安全：',
        '设置加密密钥',
        {
          confirmButtonText: '确认上传',
          cancelButtonText: '取消',
          inputType: 'password',
          inputValidator: (v) => (!v || v.trim().length < 6) ? '密钥至少6位' : true,
          inputErrorMessage: '密钥至少6位'
        }
      )
      encryptKey = value.trim()
      config.encryptKey = encryptKey
      saveConfig()
    } catch { return }
  }

  uploading.value = true
  try {
    const jsonStr = JSON.stringify(props.records, null, 2)
    const encryptedContent = CryptoJS.AES.encrypt(jsonStr, encryptKey).toString()

    const res = await fetch('/api/webdav/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: config.url,
        username: config.username,
        password: config.password,
        content: encryptedContent
      })
    })
    const result = await res.json()
    if (result.success) {
      const now = new Date().toLocaleString('zh-CN')
      lastSync.value = now
      localStorage.setItem(LAST_SYNC_KEY, now)
      ElMessage.success(`已将 ${props.recordCount} 条记录加密上传到 WebDAV`)
    } else {
      ElMessage.error(result.message || '上传失败')
    }
  } catch (e) {
    ElMessage.error('上传失败：' + e.message)
  } finally {
    uploading.value = false
  }
}

// ========== 下载 ==========

const download = async () => {
  if (!config.url) { ElMessage.warning('请先配置 WebDAV 地址'); return }

  let encryptKey = config.encryptKey
  if (!encryptKey) {
    try {
      const { value } = await ElMessageBox.prompt(
        '请输入加密密钥（上传时设置的密钥）：',
        '输入解密密钥',
        {
          confirmButtonText: '确认下载',
          cancelButtonText: '取消',
          inputType: 'password',
          inputValidator: (v) => (!v || v.trim().length < 6) ? '密钥至少6位' : true,
          inputErrorMessage: '密钥至少6位'
        }
      )
      encryptKey = value.trim()
    } catch { return }
  }

  downloading.value = true
  try {
    const res = await fetch('/api/webdav/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: config.url, username: config.username, password: config.password })
    })
    const result = await res.json()
    if (!result.success) { ElMessage.error(result.message || '下载失败'); return }

    let jsonStr = ''
    try {
      const bytes = CryptoJS.AES.decrypt(result.content, encryptKey)
      jsonStr = bytes.toString(CryptoJS.enc.Utf8)
      if (!jsonStr) throw new Error('解密内容为空')
    } catch {
      ElMessage.error('解密失败，请确认密钥是否正确')
      return
    }

    const imported = JSON.parse(jsonStr)
    if (!Array.isArray(imported)) { ElMessage.error('文件格式错误'); return }

    const valid = imported.filter(item => item.host && item.username)
    if (valid.length === 0) { ElMessage.error('未找到有效记录'); return }

    // 合并：以 host+port+username 为主键去重，远端覆盖本地
    let merged = [...props.records]
    let addedCount = 0
    valid.forEach(item => {
      const idx = merged.findIndex(
        h => h.host === item.host && h.port === item.port && h.username === item.username
      )
      if (idx !== -1) merged.splice(idx, 1)
      addedCount++
      merged.unshift(item)
    })

    const now = new Date().toLocaleString('zh-CN')
    lastSync.value = now
    localStorage.setItem(LAST_SYNC_KEY, now)

    emit('merged', merged)
    ElMessage.success(`从 WebDAV 合并了 ${addedCount} 条记录`)
  } catch (e) {
    ElMessage.error('下载失败：' + e.message)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #86868b;
  margin-top: 4px;
  line-height: 1.4;
}

.config-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.sync-area {
  padding: 4px 0;
}

.sync-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #007AFF;
  background: rgba(0, 122, 255, 0.06);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  word-break: break-all;
}

.sync-info.warning {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.08);
}

.sync-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-card {
  border-radius: 10px !important;
}

.action-content {
  display: flex;
  align-items: center;
  gap: 14px;
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.upload-icon {
  background: rgba(0, 122, 255, 0.1);
  color: #007AFF;
}

.download-icon {
  background: rgba(52, 199, 89, 0.1);
  color: #34C759;
}

.action-text {
  flex: 1;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 2px;
}

.action-desc {
  font-size: 12px;
  color: #86868b;
}

.last-sync {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #86868b;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}
</style>
