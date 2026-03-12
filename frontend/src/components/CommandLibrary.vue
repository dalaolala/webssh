<template>
  <div>
    <!-- 常用命令侧边面板 -->
    <el-drawer
      v-model="visible"
      direction="rtl"
      size="380px"
      :with-header="false"
      class="cmd-drawer"
    >
      <div class="cmd-panel">
        <!-- 头部 -->
        <div class="cmd-header">
          <div class="cmd-header-left">
            <div class="cmd-header-icon">
              <el-icon size="16"><Tickets /></el-icon>
            </div>
            <span class="cmd-header-title">命令库</span>
          </div>
          <button class="cmd-close-btn" @click="visible = false">
            <el-icon size="14"><Close /></el-icon>
          </button>
        </div>

        <!-- 搜索框 -->
        <div class="cmd-search-wrap">
          <div class="cmd-search-inner">
            <el-icon class="cmd-search-icon" size="13"><Search /></el-icon>
            <input
              v-model="searchCommandQuery"
              class="cmd-search-input"
              placeholder="搜索命令…"
            />
            <button v-if="searchCommandQuery" class="cmd-search-clear" @click="searchCommandQuery = ''">
              <el-icon size="12"><Close /></el-icon>
            </button>
          </div>
        </div>

        <!-- Tab 切换 -->
        <div class="cmd-tabs">
          <button
            class="cmd-tab"
            :class="{ active: activeCommandTab === 'built-in' }"
            @click="activeCommandTab = 'built-in'"
          >
            内置命令
          </button>
          <button
            class="cmd-tab"
            :class="{ active: activeCommandTab === 'private' }"
            @click="activeCommandTab = 'private'"
          >
            我的片段
            <span v-if="privateSnippets.length" class="cmd-tab-badge">{{ privateSnippets.length }}</span>
          </button>
        </div>

        <!-- 内容区 -->
        <div class="cmd-content">
          <!-- 内置命令 -->
          <template v-if="activeCommandTab === 'built-in'">
            <div v-if="filteredCommands.every(c => c.commands.length === 0)" class="cmd-empty">
              <el-icon size="32" color="#4a4a5a"><Search /></el-icon>
              <p>没有匹配的命令</p>
            </div>
            <div v-else class="cmd-category-list">
              <div
                v-for="(category, index) in filteredCommands"
                :key="index"
                v-show="category.commands.length > 0"
                class="cmd-category"
              >
                <!-- 分类标题 -->
                <div
                  class="cmd-category-header"
                  @click="toggleCategory(index)"
                >
                  <div class="cmd-category-header-left">
                    <div class="cmd-category-dot"></div>
                    <el-icon size="13" class="cmd-category-icon"><component :is="category.icon" /></el-icon>
                    <span class="cmd-category-name">{{ category.category }}</span>
                    <span class="cmd-category-count">{{ category.commands.length }}</span>
                  </div>
                  <el-icon
                    size="12"
                    class="cmd-category-chevron"
                    :class="{ collapsed: !expandedCategories.has(index) }"
                  ><ArrowDown /></el-icon>
                </div>

                <!-- 命令列表 -->
                <div v-show="expandedCategories.has(index)" class="cmd-items">
                  <div
                    v-for="(cmd, cmdIdx) in category.commands"
                    :key="cmdIdx"
                    class="cmd-item"
                    @mouseenter="hoveredCmd = `${index}-${cmdIdx}`"
                    @mouseleave="hoveredCmd = null"
                  >
                    <div class="cmd-item-body">
                      <span class="cmd-item-name">{{ cmd.name }}</span>
                      <code class="cmd-item-code">{{ cmd.command }}</code>
                    </div>
                    <div class="cmd-item-actions" :class="{ visible: hoveredCmd === `${index}-${cmdIdx}` }">
                      <button class="cmd-btn cmd-btn-run" @click="injectCommand(cmd.command)" title="在终端执行">
                        <el-icon size="11"><VideoPlay /></el-icon>
                        <span>运行</span>
                      </button>
                      <button class="cmd-btn cmd-btn-copy" @click="copyCommand(cmd.command)" title="复制命令">
                        <el-icon size="11"><CopyDocument /></el-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 我的片段 -->
          <template v-else>
            <div class="cmd-snippet-toolbar">
              <button class="cmd-new-btn" @click="openSnippetDialog()">
                <el-icon size="12"><Plus /></el-icon>
                <span>新建片段</span>
              </button>
              <div class="cmd-snippet-io">
                <button class="cmd-icon-btn" @click="exportSnippets" title="导出">
                  <el-icon size="13"><Download /></el-icon>
                </button>
                <button class="cmd-icon-btn" @click="triggerSnippetImport" title="导入">
                  <el-icon size="13"><Upload /></el-icon>
                </button>
                <input
                  type="file"
                  ref="snippetFileInput"
                  style="display: none"
                  accept=".json"
                  @change="importSnippets"
                />
              </div>
            </div>

            <div v-if="filteredPrivateSnippets.length === 0" class="cmd-empty">
              <el-icon size="32" color="#4a4a5a"><DocumentAdd /></el-icon>
              <p>{{ searchCommandQuery ? '没有匹配的片段' : '还没有自定义片段' }}</p>
              <button v-if="!searchCommandQuery" class="cmd-empty-action" @click="openSnippetDialog()">
                创建第一个片段
              </button>
            </div>

            <div v-else class="cmd-items cmd-items-private">
              <div
                v-for="(cmd) in filteredPrivateSnippets"
                :key="cmd.id"
                class="cmd-item cmd-item-private"
                @mouseenter="hoveredPrivate = cmd.id"
                @mouseleave="hoveredPrivate = null"
              >
                <div class="cmd-item-body">
                  <span class="cmd-item-name">{{ cmd.name }}</span>
                  <code class="cmd-item-code">{{ cmd.command }}</code>
                </div>
                <div class="cmd-item-actions" :class="{ visible: hoveredPrivate === cmd.id }">
                  <button class="cmd-btn cmd-btn-run" @click="injectCommand(cmd.command)" title="在终端执行">
                    <el-icon size="11"><VideoPlay /></el-icon>
                    <span>运行</span>
                  </button>
                  <button class="cmd-btn cmd-btn-copy" @click="copyCommand(cmd.command)" title="复制">
                    <el-icon size="11"><CopyDocument /></el-icon>
                  </button>
                  <button class="cmd-btn cmd-btn-edit" @click="openSnippetDialog(cmd)" title="编辑">
                    <el-icon size="11"><Edit /></el-icon>
                  </button>
                  <button class="cmd-btn cmd-btn-delete" @click="deleteSnippet(cmd)" title="删除">
                    <el-icon size="11"><Delete /></el-icon>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 底部提示 -->
        <div class="cmd-footer">
          <el-icon size="11"><InfoFilled /></el-icon>
          <span>点击"运行"将立即在当前终端执行</span>
        </div>
      </div>
    </el-drawer>

    <!-- 新建/编辑片段弹窗 -->
    <el-dialog
      v-model="showSnippetDialog"
      :title="editingSnippet?.id ? '编辑片段' : '新建片段'"
      width="420px"
      append-to-body
      destroy-on-close
      class="cmd-dialog"
    >
      <el-form ref="snippetFormRef" :model="snippetForm" :rules="snippetRules" label-width="80px">
        <el-form-item label="片段名称" prop="name">
          <el-input v-model="snippetForm.name" placeholder="输入一个简短的名称" />
        </el-form-item>
        <el-form-item label="命令内容" prop="command">
          <el-input
            v-model="snippetForm.command"
            type="textarea"
            :rows="6"
            placeholder="输入 Linux 命令或 Shell 脚本，支持多行"
            style="font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 13px;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSnippetDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSnippet">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import {
  CopyDocument, Search, Edit, Delete, Plus, Download, Upload,
  Monitor, Folder, Connection, Cpu, Box, Lock,
  VideoPlay, ArrowDown, Close, InfoFilled, DocumentAdd, Tickets
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import commonCommandsData from '@/assets/commands.json'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'command'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 状态
const commonCommands = ref(commonCommandsData)
const searchCommandQuery = ref('')
const activeCommandTab = ref('built-in')
const hoveredCmd = ref(null)
const hoveredPrivate = ref(null)

// 展开/折叠分类（默认全部展开）
const expandedCategories = reactive(new Set(commonCommandsData.map((_, i) => i)))
const toggleCategory = (index) => {
  if (expandedCategories.has(index)) {
    expandedCategories.delete(index)
  } else {
    expandedCategories.add(index)
  }
}

// 私有片段
const PRIVATE_SNIPPETS_KEY = 'webssh_private_snippets'
const privateSnippets = ref(JSON.parse(localStorage.getItem(PRIVATE_SNIPPETS_KEY) || '[]'))
const showSnippetDialog = ref(false)
const snippetFormRef = ref(null)
const editingSnippet = ref(null)
const snippetFileInput = ref(null)
const snippetForm = ref({ name: '', command: '' })
const snippetRules = {
  name: [{ required: true, message: '请输入片段名称', trigger: 'blur' }],
  command: [{ required: true, message: '请输入命令内容', trigger: 'blur' }]
}

const savePrivateSnippets = () => {
  localStorage.setItem(PRIVATE_SNIPPETS_KEY, JSON.stringify(privateSnippets.value))
}

// 过滤内置命令
const filteredCommands = computed(() => {
  const query = searchCommandQuery.value.toLowerCase().trim()
  if (!query) return commonCommands.value
  return commonCommands.value.map(category => ({
    ...category,
    commands: category.commands.filter(cmd =>
      cmd.name.toLowerCase().includes(query) ||
      cmd.command.toLowerCase().includes(query)
    )
  }))
})

// 过滤私有片段
const filteredPrivateSnippets = computed(() => {
  const query = searchCommandQuery.value.toLowerCase().trim()
  if (!query) return privateSnippets.value
  return privateSnippets.value.filter(cmd =>
    cmd.name.toLowerCase().includes(query) ||
    cmd.command.toLowerCase().includes(query)
  )
})

// 执行命令
const injectCommand = (cmd) => emit('command', cmd)

// 复制命令
const copyCommand = async (cmd) => {
  try {
    await navigator.clipboard.writeText(cmd)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 片段管理
const openSnippetDialog = (snippet = null) => {
  editingSnippet.value = snippet
  snippetForm.value = snippet ? { ...snippet } : { name: '', command: '' }
  showSnippetDialog.value = true
}

const saveSnippet = () => {
  snippetFormRef.value.validate((valid) => {
    if (!valid) return
    if (editingSnippet.value?.id) {
      const index = privateSnippets.value.findIndex(s => s.id === editingSnippet.value.id)
      if (index > -1) privateSnippets.value[index] = { ...editingSnippet.value, ...snippetForm.value }
    } else {
      privateSnippets.value.unshift({ id: Date.now(), ...snippetForm.value })
    }
    savePrivateSnippets()
    showSnippetDialog.value = false
    ElMessage.success('已保存')
  })
}

const deleteSnippet = (snippet) => {
  ElMessageBox.confirm(`确定要删除「${snippet.name}」吗？`, '删除片段', {
    type: 'warning',
    confirmButtonText: '删除',
    confirmButtonClass: 'el-button--danger'
  }).then(() => {
    privateSnippets.value = privateSnippets.value.filter(s => s.id !== snippet.id)
    savePrivateSnippets()
    ElMessage.success('已删除')
  }).catch(() => {})
}

// 导入/导出
const exportSnippets = () => {
  if (!privateSnippets.value.length) return ElMessage.warning('没有可导出的片段')
  const blob = new Blob([JSON.stringify(privateSnippets.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `webssh_snippets_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

const triggerSnippetImport = () => snippetFileInput.value.click()

const importSnippets = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result)
      if (Array.isArray(data)) {
        const valid = data.filter(item => item.name && item.command)
        const existingSet = new Set(privateSnippets.value.map(s => s.name.trim() + '|' + s.command.trim()))
        const newItems = []
        valid.forEach(item => {
          const key = item.name.trim() + '|' + item.command.trim()
          if (!existingSet.has(key)) {
            existingSet.add(key)
            newItems.push({ ...item, id: Date.now() + Math.random() })
          }
        })
        if (newItems.length) {
          privateSnippets.value = [...newItems, ...privateSnippets.value]
          savePrivateSnippets()
          const skipped = valid.length - newItems.length
          ElMessage.success(skipped > 0
            ? `导入 ${newItems.length} 条，跳过 ${skipped} 条重复`
            : `成功导入 ${newItems.length} 条片段`)
        } else {
          ElMessage.warning('全部片段均已存在')
        }
      } else {
        ElMessage.error('格式不正确')
      }
    } catch {
      ElMessage.error('文件解析失败')
    }
    e.target.value = ''
  }
  reader.readAsText(file)
}
</script>

<style scoped>
/* ===== 抽屉容器 ===== */
:deep(.cmd-drawer) {
  background: transparent !important;
}
:deep(.cmd-drawer .el-drawer__body) {
  padding: 0;
  overflow: hidden;
  background: #1e1e2e;
}

/* ===== 面板主体 ===== */
.cmd-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e2e;
  color: #cdd6f4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}

/* ===== 头部 ===== */
.cmd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #313244;
  flex-shrink: 0;
}

.cmd-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cmd-header-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: linear-gradient(135deg, #89b4fa, #cba6f7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e1e2e;
}

.cmd-header-title {
  font-size: 14px;
  font-weight: 600;
  color: #cdd6f4;
  letter-spacing: 0.3px;
}

.cmd-close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c7086;
  transition: background 0.15s, color 0.15s;
}
.cmd-close-btn:hover {
  background: #313244;
  color: #cdd6f4;
}

/* ===== 搜索框 ===== */
.cmd-search-wrap {
  padding: 12px 16px 0;
  flex-shrink: 0;
}

.cmd-search-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #181825;
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 6px 10px;
  transition: border-color 0.15s;
}
.cmd-search-inner:focus-within {
  border-color: #89b4fa;
}

.cmd-search-icon {
  color: #6c7086;
  flex-shrink: 0;
}

.cmd-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: #cdd6f4;
  min-width: 0;
}
.cmd-search-input::placeholder {
  color: #45475a;
}

.cmd-search-clear {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #6c7086;
  display: flex;
  align-items: center;
  padding: 0;
  border-radius: 3px;
  transition: color 0.15s;
}
.cmd-search-clear:hover { color: #cdd6f4; }

/* ===== Tab 切换 ===== */
.cmd-tabs {
  display: flex;
  gap: 2px;
  padding: 12px 16px 0;
  flex-shrink: 0;
}

.cmd-tab {
  flex: 1;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: #6c7086;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.cmd-tab:hover {
  background: #313244;
  color: #bac2de;
}
.cmd-tab.active {
  background: #313244;
  color: #89b4fa;
}

.cmd-tab-badge {
  background: #89b4fa22;
  color: #89b4fa;
  border-radius: 10px;
  font-size: 11px;
  padding: 0 6px;
  line-height: 18px;
}

/* ===== 内容区 ===== */
.cmd-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  scrollbar-width: thin;
  scrollbar-color: #313244 transparent;
}
.cmd-content::-webkit-scrollbar { width: 4px; }
.cmd-content::-webkit-scrollbar-track { background: transparent; }
.cmd-content::-webkit-scrollbar-thumb { background: #313244; border-radius: 2px; }

/* ===== 空状态 ===== */
.cmd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: #45475a;
}
.cmd-empty p {
  font-size: 13px;
  margin: 0;
}
.cmd-empty-action {
  background: #313244;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12.5px;
  color: #89b4fa;
  cursor: pointer;
  transition: background 0.15s;
}
.cmd-empty-action:hover { background: #45475a; }

/* ===== 分类 ===== */
.cmd-category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cmd-category {
  border-radius: 8px;
  overflow: hidden;
}

.cmd-category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 10px;
  cursor: pointer;
  border-radius: 7px;
  user-select: none;
  transition: background 0.15s;
}
.cmd-category-header:hover {
  background: #313244;
}

.cmd-category-header-left {
  display: flex;
  align-items: center;
  gap: 7px;
}

.cmd-category-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #89b4fa;
  flex-shrink: 0;
}

.cmd-category-icon {
  color: #89b4fa;
  opacity: 0.8;
}

.cmd-category-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #bac2de;
  letter-spacing: 0.2px;
}

.cmd-category-count {
  font-size: 11px;
  color: #45475a;
  background: #313244;
  padding: 1px 6px;
  border-radius: 8px;
}

.cmd-category-chevron {
  color: #6c7086;
  transition: transform 0.2s;
}
.cmd-category-chevron.collapsed {
  transform: rotate(-90deg);
}

/* ===== 命令条目 ===== */
.cmd-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0 4px 0;
}

.cmd-items-private {
  margin-top: 8px;
}

.cmd-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 7px;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
  cursor: default;
}
.cmd-item:hover {
  background: #181825;
  border-color: #313244;
}

.cmd-item-private {
  border-left: 2px solid #a6e3a1 !important;
  padding-left: 8px;
}
.cmd-item-private:hover {
  border-color: #a6e3a1;
}

.cmd-item-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.cmd-item-name {
  font-size: 13px;
  font-weight: 500;
  color: #cdd6f4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmd-item-code {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 11.5px;
  color: #f9e2af;
  background: #11111b;
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid #313244;
  word-break: break-all;
  display: block;
  line-height: 1.5;
}

/* ===== 操作按钮区 ===== */
.cmd-item-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.cmd-item-actions.visible {
  opacity: 1;
}

.cmd-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 8px;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.cmd-btn-run {
  background: #1e3a5f;
  color: #89b4fa;
}
.cmd-btn-run:hover {
  background: #89b4fa;
  color: #1e1e2e;
}

.cmd-btn-copy {
  background: #313244;
  color: #9399b2;
  padding: 4px 6px;
}
.cmd-btn-copy:hover {
  background: #45475a;
  color: #cdd6f4;
}

.cmd-btn-edit {
  background: #2a2a3e;
  color: #f9e2af;
  padding: 4px 6px;
}
.cmd-btn-edit:hover {
  background: #f9e2af;
  color: #1e1e2e;
}

.cmd-btn-delete {
  background: #2a1f1f;
  color: #f38ba8;
  padding: 4px 6px;
}
.cmd-btn-delete:hover {
  background: #f38ba8;
  color: #1e1e2e;
}

/* ===== 片段工具栏 ===== */
.cmd-snippet-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px 10px;
  border-bottom: 1px solid #313244;
  margin-bottom: 4px;
}

.cmd-new-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #1e3a5f;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: #89b4fa;
  cursor: pointer;
  transition: background 0.15s;
}
.cmd-new-btn:hover {
  background: #89b4fa;
  color: #1e1e2e;
}

.cmd-snippet-io {
  display: flex;
  gap: 4px;
}

.cmd-icon-btn {
  width: 28px;
  height: 28px;
  background: #313244;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9399b2;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.cmd-icon-btn:hover {
  background: #45475a;
  color: #cdd6f4;
}

/* ===== 底部提示 ===== */
.cmd-footer {
  padding: 10px 16px;
  border-top: 1px solid #313244;
  font-size: 11.5px;
  color: #45475a;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
</style>
