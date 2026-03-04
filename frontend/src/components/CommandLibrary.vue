<template>
  <div>
    <!-- 常用命令抽屉 -->
    <el-drawer
      v-model="visible"
      title="常用命令库"
      direction="rtl"
      size="320px"
      :with-header="true"
    >
      <div class="command-list-container">
        <!-- 搜索框 -->
        <div class="command-search">
          <el-input
            v-model="searchCommandQuery"
            placeholder="搜索命令名称或内容..."
            clearable
            :prefix-icon="Search"
          />
        </div>

        <el-tabs v-model="activeCommandTab" class="command-tabs">
          <!-- 内置命令 Tab -->
          <el-tab-pane label="内置命令" name="built-in">
            <el-collapse v-model="activeCommandCategories" class="command-collapse">
              <el-collapse-item 
                v-for="(category, index) in filteredCommands" 
                :key="index"
                :name="index"
                v-show="category.commands.length > 0"
              >
                <template #title>
                  <el-icon style="margin-right: 8px;"><component :is="category.icon" /></el-icon>
                  {{ category.category }}
                  <span class="cmd-count">({{ category.commands.length }})</span>
                </template>
                <div class="command-items">
                  <div 
                    v-for="(cmd, cmdIdx) in category.commands" 
                    :key="cmdIdx"
                    class="command-item"
                  >
                    <div class="cmd-info">
                      <span class="cmd-name">{{ cmd.name }}</span>
                      <code class="cmd-code">{{ cmd.command }}</code>
                    </div>
                    <div class="cmd-actions">
                      <el-button 
                        type="primary" 
                        size="small" 
                        plain 
                        @click="injectCommand(cmd.command)"
                        title="立即在终端运行"
                      >
                        运行
                      </el-button>
                      <el-button 
                        size="small" 
                        circle
                        @click="copyCommand(cmd.command)"
                        title="复制命令"
                      >
                        <el-icon><CopyDocument /></el-icon>
                      </el-button>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>

            <div v-if="filteredCommands.every(c => c.commands.length === 0)" class="no-commands">
              <el-empty description="没有找到匹配的内置命令" :image-size="60" />
            </div>
          </el-tab-pane>

          <!-- 私有片段 Tab -->
          <el-tab-pane label="我的片段" name="private">
            <div class="private-actions">
              <el-button type="success" size="small" @click="openSnippetDialog()">
                <el-icon><Plus /></el-icon> 新建片段
              </el-button>
              <div class="private-io-actions">
                <el-button size="small" text @click="exportSnippets" title="导出代码片段">
                  <el-icon><Download /></el-icon>
                </el-button>
                <el-button size="small" text @click="triggerSnippetImport" title="导入代码片段">
                  <el-icon><Upload /></el-icon>
                </el-button>
                <input 
                  type="file" 
                  ref="snippetFileInput" 
                  style="display: none" 
                  accept=".json" 
                  @change="importSnippets"
                >
              </div>
            </div>

            <div class="command-collapse private-collapse">
              <div v-if="filteredPrivateSnippets.length === 0" class="no-commands">
                <el-empty description="没有匹配的私有片段" :image-size="60" />
              </div>
              
              <div class="command-items">
                <div 
                  v-for="(cmd, index) in filteredPrivateSnippets" 
                  :key="cmd.id"
                  class="command-item private-item"
                >
                  <div class="cmd-info">
                    <span class="cmd-name">{{ cmd.name }}</span>
                    <code class="cmd-code">{{ cmd.command }}</code>
                  </div>
                  <div class="cmd-actions">
                    <el-button 
                      type="primary" 
                      size="small" 
                      plain 
                      @click="injectCommand(cmd.command)"
                      title="立即在终端运行"
                    >
                      运行
                    </el-button>
                    <el-button 
                      size="small" 
                      circle
                      @click="copyCommand(cmd.command)"
                      title="复制命令"
                    >
                      <el-icon><CopyDocument /></el-icon>
                    </el-button>
                    <el-dropdown trigger="click" @command="(action) => handleSnippetAction(action, cmd)">
                      <el-button size="small" circle style="margin-left: 8px;">
                        <el-icon><More /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item command="edit">
                            <el-icon><Edit /></el-icon> 编辑
                          </el-dropdown-item>
                          <el-dropdown-item command="delete" style="color: #f56c6c;">
                            <el-icon><Delete /></el-icon> 删除
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

        <div class="command-tips" v-if="visible">
          <el-icon><Warning /></el-icon>
          点击"运行"将立即在当前终端执行该命令
        </div>
      </div>
    </el-drawer>

    <!-- 私有片段编辑弹窗 -->
    <el-dialog
      v-model="showSnippetDialog"
      :title="editingSnippet?.id ? '编辑代码片段' : '新建代码片段'"
      width="400px"
      append-to-body
      destroy-on-close
    >
      <el-form ref="snippetFormRef" :model="snippetForm" :rules="snippetRules" label-width="80px">
        <el-form-item label="片段名称" prop="name">
          <el-input v-model="snippetForm.name" placeholder="请输入简短的名称" />
        </el-form-item>
        <el-form-item label="代码内容" prop="command">
          <el-input 
            v-model="snippetForm.command" 
            type="textarea" 
            :rows="6" 
            placeholder="请输入完整的 Linux 命令行或 Shell 脚本片段，支持多行"
            style="font-family: monospace;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSnippetDialog = false">取消</el-button>
          <el-button type="primary" @click="saveSnippet">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { CopyDocument, Search, Warning, Edit, Delete, Plus, Download, Upload, More, Monitor, Folder, Connection, Cpu, Box, Lock } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import commonCommandsData from '@/assets/commands.json'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'command'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// 状态
const commonCommands = ref(commonCommandsData)
const activeCommandCategories = ref([0, 1, 2, 3, 4, 5]) // 默认展开所有分类
const searchCommandQuery = ref('')
const activeCommandTab = ref('built-in')

// 私有代码片段相关状态
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

// 监听私有片段变化并保存
watch(privateSnippets, (newVal) => {
  localStorage.setItem(PRIVATE_SNIPPETS_KEY, JSON.stringify(newVal))
}, { deep: true })

// 过滤后的内置命令
const filteredCommands = computed(() => {
  const query = searchCommandQuery.value.toLowerCase().trim()
  if (!query) return commonCommands.value

  return commonCommands.value.map(category => {
    return {
      ...category,
      commands: category.commands.filter(cmd => 
        cmd.name.toLowerCase().includes(query) || 
        cmd.command.toLowerCase().includes(query)
      )
    }
  })
})

// 过滤后的私有片段
const filteredPrivateSnippets = computed(() => {
  const query = searchCommandQuery.value.toLowerCase().trim()
  if (!query) return privateSnippets.value
  return privateSnippets.value.filter(cmd => 
    cmd.name.toLowerCase().includes(query) || 
    cmd.command.toLowerCase().includes(query)
  )
})

// 注入命令（发射给父组件）
const injectCommand = (cmd) => {
  emit('command', cmd)
}

// 复制命令
const copyCommand = async (cmd) => {
  try {
    await navigator.clipboard.writeText(cmd)
    ElMessage.success('命令已复制')
  } catch (err) {
    ElMessage.error('复制失败，您的浏览器可能不支持该功能')
  }
}

// 私有片段 API
const openSnippetDialog = (snippet = null) => {
  editingSnippet.value = snippet
  if (snippet) {
    snippetForm.value = { ...snippet }
  } else {
    snippetForm.value = { name: '', command: '' }
  }
  showSnippetDialog.value = true
}

const saveSnippet = () => {
  snippetFormRef.value.validate((valid) => {
    if (valid) {
      if (editingSnippet.value?.id) {
        // 更新
        const index = privateSnippets.value.findIndex(s => s.id === editingSnippet.value.id)
        if (index > -1) {
          privateSnippets.value[index] = { ...editingSnippet.value, ...snippetForm.value }
        }
      } else {
        // 新增
        privateSnippets.value.unshift({
          id: Date.now(),
          ...snippetForm.value
        })
      }
      showSnippetDialog.value = false
      ElMessage.success('保存成功')
    }
  })
}

const handleSnippetAction = (action, snippet) => {
  if (action === 'edit') {
    openSnippetDialog(snippet)
  } else if (action === 'delete') {
    ElMessageBox.confirm('确定要删除这个代码片段吗？', '提示', {
      type: 'warning'
    }).then(() => {
      privateSnippets.value = privateSnippets.value.filter(s => s.id !== snippet.id)
      ElMessage.success('已删除')
    }).catch(() => {})
  }
}

// 私有片段导入/导出
const exportSnippets = () => {
  if (privateSnippets.value.length === 0) {
    return ElMessage.warning('没有可导出的数据')
  }
  const dataStr = JSON.stringify(privateSnippets.value, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `webssh_snippets_${new Date().getTime()}.json`
  a.click()
  window.URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

const triggerSnippetImport = () => {
  snippetFileInput.value.click()
}

const importSnippets = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result)
      if (Array.isArray(data)) {
        const validData = data.filter(item => item.name && item.command)
        if (validData.length > 0) {
          const existingSet = new Set(privateSnippets.value.map(s => s.name.trim() + '|' + s.command.trim()))
          const newSnippets = []
          
          validData.forEach(item => {
            const key = item.name.trim() + '|' + item.command.trim()
            if (!existingSet.has(key)) {
              existingSet.add(key) // 导入文件中自身也可能有重复，加进去防重复
              newSnippets.push({
                ...item,
                id: Date.now() + Math.random() 
              })
            }
          })

          if (newSnippets.length > 0) {
            privateSnippets.value = [...newSnippets, ...privateSnippets.value]
            const skipped = validData.length - newSnippets.length
            if (skipped > 0) {
              ElMessage.success(`成功导入 ${newSnippets.length} 条代码片段，跳过 ${skipped} 条重复项`)
            } else {
              ElMessage.success(`成功导入 ${newSnippets.length} 条代码片段`)
            }
          } else {
            ElMessage.warning('导入的片段均已存在，无需重复导入')
          }
        } else {
          ElMessage.error('文件内容格式不正确或为空')
        }
      } else {
        ElMessage.error('无法解析该文件格式')
      }
    } catch (err) {
      ElMessage.error('读取文件失败，请确保是合法的 JSON 文件')
    }
    e.target.value = ''
  }
  reader.readAsText(file)
}
</script>

<style scoped>
/* 常用命令抽屉样式 */
.command-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.command-search {
  padding: 0 0 16px 0;
  position: sticky;
  top: 0;
  background-color: #fff;
  z-index: 5;
}

.command-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.command-tabs .el-tabs__content) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.command-tabs .el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.command-collapse {
  flex: 1;
  overflow-y: auto;
  border-top: none;
}
.command-collapse::-webkit-scrollbar {
  width: 6px;
}
.command-collapse::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.cmd-count {
  margin-left: 6px;
  font-size: 12px;
  color: #909399;
}

.private-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.private-io-actions {
  display: flex;
  gap: 4px;
}

.private-collapse {
  margin-top: 12px;
}

.private-item {
  border-left: 3px solid #67c23a;
}

.command-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 12px 0;
}

.command-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s;
}

.command-item:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.05);
}

.cmd-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.cmd-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.cmd-code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #e6a23c;
  background-color: #2d2d30;
  padding: 6px 10px;
  border-radius: 4px;
  word-break: break-all;
  border: 1px solid #3e3e42;
}

.cmd-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.command-tips {
  margin-top: 16px;
  padding: 12px;
  background-color: #f0f9eb;
  color: #67c23a;
  border-radius: 4px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.no-commands {
  padding: 40px 0;
}
</style>
