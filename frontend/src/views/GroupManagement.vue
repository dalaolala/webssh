<template>
  <div class="group-management">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="header-content">
        <div class="header-left">
          <el-button @click="$router.back()" size="small">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <h1>分组管理</h1>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="showAddGroupDialog = true">
            <el-icon><Plus /></el-icon>
            添加分组
          </el-button>
        </div>
      </div>
    </el-header>

    <el-main class="main-content">
      <!-- 分组列表 -->
      <div class="groups-container">
        <el-row :gutter="20">
          <el-col :span="8" v-for="group in groups" :key="group.id">
            <el-card class="group-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <div class="group-info">
                    <el-icon class="group-icon"><Folder /></el-icon>
                    <span class="group-name">{{ group.name }}</span>
                  </div>
                  <div class="card-actions">
                    <el-button 
                      size="small" 
                      text 
                      @click="editGroup(group)"
                      title="编辑分组"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      @click="deleteGroup(group)"
                      title="删除分组"
                      style="color: #f56c6c;"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </template>
              
              <!-- 分组服务器列表 -->
              <div class="servers-list">
                <div 
                  v-for="server in getServersByGroup(group.name)" 
                  :key="server.id"
                  class="server-item"
                >
                  <div class="server-info">
                    <el-icon><Monitor /></el-icon>
                    <div class="server-details">
                      <div class="server-name">{{ server.name }}</div>
                      <div class="server-address">{{ server.host }}:{{ server.port }}</div>
                    </div>
                  </div>
                  <div class="server-actions">
                    <el-button 
                      size="small" 
                      text 
                      @click="editServer(server)"
                      title="编辑服务器"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      @click="deleteServer(server)"
                      title="删除服务器"
                      style="color: #f56c6c;"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
                
                <!-- 添加服务器按钮 -->
                <div class="add-server-btn">
                  <el-button 
                    type="primary" 
                    size="small" 
                    text 
                    @click="addServerToGroup(group)"
                    style="width: 100%;"
                  >
                    <el-icon><Plus /></el-icon>
                    添加服务器
                  </el-button>
                </div>
                
                <div v-if="getServersByGroup(group.name).length === 0" class="empty-servers">
                  <el-icon><InfoFilled /></el-icon>
                  <span>该分组暂无服务器</span>
                </div>
              </div>
              
              <!-- 分组统计 -->
              <div class="group-stats">
                <span class="server-count">
                  服务器数量: {{ getServersByGroup(group.name).length }}
                </span>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 空状态提示 -->
        <div v-if="groups.length === 0" class="empty-state">
          <el-icon size="64" color="#909399"><FolderOpened /></el-icon>
          <h3>暂无分组</h3>
          <p>点击"添加分组"按钮创建您的第一个服务器分组</p>
          <el-button type="primary" @click="showAddGroupDialog = true">
            <el-icon><Plus /></el-icon>
            添加分组
          </el-button>
        </div>
      </div>
    </el-main>

    <!-- 添加分组对话框 -->
    <el-dialog v-model="showAddGroupDialog" title="添加分组" width="400px">
      <el-form :model="newGroup" :rules="groupRules" ref="addGroupForm">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="newGroup.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="分组描述" prop="description">
          <el-input 
            v-model="newGroup.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入分组描述（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddGroup" :loading="addingGroup">
          确认添加
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑分组对话框 -->
    <el-dialog v-model="showEditGroupDialog" :title="'编辑分组 - ' + editingGroup.name" width="400px">
      <el-form :model="editingGroup" :rules="groupRules" ref="editGroupForm">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="editingGroup.name" placeholder="请输入分组名称" />
        </el-form-item>
        <el-form-item label="分组描述" prop="description">
          <el-input 
            v-model="editingGroup.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入分组描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateGroup" :loading="updatingGroup">
          保存修改
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑服务器对话框 -->
    <el-dialog v-model="showEditServerDialog" :title="'编辑服务器 - ' + editingServer.name" width="500px">
      <ServerForm 
        v-if="editingServer.id" 
        :server-id="editingServer.id" 
        @success="handleServerUpdated" 
        @cancel="showEditServerDialog = false" 
      />
    </el-dialog>

    <!-- 添加服务器对话框 -->
    <el-dialog v-model="showAddServerDialog" :title="'添加服务器到 ' + addingServerToGroup.groupName + ' 分组'" width="500px">
      <ServerForm 
        :group-name="addingServerToGroup.groupName"
        @success="handleServerAdded" 
        @cancel="showAddServerDialog = false" 
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, 
  Plus, 
  Folder, 
  Edit, 
  Delete, 
  Monitor,
  FolderOpened,
  InfoFilled
} from '@element-plus/icons-vue'
import { useServersStore } from '@/stores/servers'
import ServerForm from '@/components/ServerForm.vue'

const serversStore = useServersStore()

// 响应式数据
const showAddGroupDialog = ref(false)
const showEditGroupDialog = ref(false)
const showEditServerDialog = ref(false)
const showAddServerDialog = ref(false)
const addingGroup = ref(false)
const updatingGroup = ref(false)

const newGroup = ref({
  name: '',
  description: ''
})

const editingGroup = ref({
  id: null,
  name: '',
  description: ''
})

const editingServer = ref({
  id: null,
  name: ''
})

const addingServerToGroup = ref({
  groupName: ''
})

const groupRules = {
  name: [
    { required: true, message: '请输入分组名称', trigger: 'blur' },
    { min: 1, max: 50, message: '分组名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const groups = computed(() => serversStore.groups)

// 方法：根据分组名称获取服务器列表
const getServersByGroup = (groupName) => {
  return serversStore.servers.filter(server => server.group_name === groupName)
}

// 方法：添加分组
const handleAddGroup = async () => {
  try {
    addingGroup.value = true
    const result = await serversStore.addGroup(newGroup.value)
    
    if (result.success) {
      ElMessage.success('分组添加成功')
      showAddGroupDialog.value = false
      newGroup.value = { name: '', description: '' }
    } else {
      ElMessage.error(result.error)
    }
  } catch (error) {
    ElMessage.error('添加分组失败')
  } finally {
    addingGroup.value = false
  }
}

// 方法：编辑分组
const editGroup = (group) => {
  editingGroup.value = { ...group }
  showEditGroupDialog.value = true
}

const handleUpdateGroup = async () => {
  try {
    updatingGroup.value = true
    const result = await serversStore.updateGroup(editingGroup.value.id, editingGroup.value)
    
    if (result.success) {
      ElMessage.success('分组更新成功')
      showEditGroupDialog.value = false
      editingGroup.value = { id: null, name: '', description: '' }
    } else {
      ElMessage.error(result.error)
    }
  } catch (error) {
    ElMessage.error('更新分组失败')
  } finally {
    updatingGroup.value = false
  }
}

// 方法：删除分组
const deleteGroup = async (group) => {
  try {
    const serversInGroup = getServersByGroup(group.name)
    
    // 如果分组中有服务器，不允许删除
    if (serversInGroup.length > 0) {
      ElMessage.error(`分组 "${group.name}" 中包含 ${serversInGroup.length} 个服务器，请先删除或移出所有服务器后再删除分组`)
      return
    }
    
    // 确认删除空分组
    await ElMessageBox.confirm(
      `确定要删除分组 "${group.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const result = await serversStore.deleteGroup(group.id)
    
    if (result.success) {
      ElMessage.success('分组删除成功')
    } else {
      ElMessage.error(result.error)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 方法：编辑服务器
const editServer = (server) => {
  // 重置表单数据，确保每次编辑都从后台获取最新数据
  editingServer.value = { 
    id: server.id,
    name: server.name // 保留名称用于对话框标题
  }
  showEditServerDialog.value = true
}

// 方法：删除服务器
const deleteServer = async (server) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除服务器 "${server.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const result = await serversStore.deleteServer(server.id)
    
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

// 方法：添加服务器到分组
const addServerToGroup = (group) => {
  addingServerToGroup.value = { groupName: group.name }
  showAddServerDialog.value = true
}

// 方法：服务器添加成功处理
const handleServerAdded = () => {
  showAddServerDialog.value = false
  addingServerToGroup.value = { groupName: '' }
  ElMessage.success('服务器添加成功')
}

// 方法：服务器更新成功处理
const handleServerUpdated = () => {
  showEditServerDialog.value = false
  editingServer.value = { id: null, name: '' }
  ElMessage.success('服务器更新成功')
}

// 生命周期
onMounted(async () => {
  await serversStore.fetchServers()
})
</script>

<style scoped>
.group-management {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.main-content {
  padding: 20px;
  height: calc(100vh - 60px);
  overflow-y: auto;
}

.groups-container {
  max-width: 1200px;
  margin: 0 auto;
}

.group-card {
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.group-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-icon {
  color: #409eff;
  font-size: 18px;
}

.group-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.servers-list {
  margin-bottom: 16px;
}

.server-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.server-item:last-child {
  border-bottom: none;
}

.server-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.server-details {
  min-width: 0;
}

.server-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.server-address {
  font-size: 12px;
  color: #999;
}

.server-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.server-item:hover .server-actions {
  opacity: 1;
}

.empty-servers {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
  gap: 8px;
}

.group-stats {
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.server-count {
  font-size: 12px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #909399;
}

.empty-state h3 {
  margin: 16px 0 8px;
  font-size: 18px;
  font-weight: 500;
}

.empty-state p {
  margin-bottom: 20px;
  font-size: 14px;
}

/* 添加服务器按钮样式 */
.add-server-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  margin-top: 8px;
  border-top: 1px dashed #e0e0e0;
}

.add-server-btn .el-button {
  color: #409eff;
  border-color: #409eff;
}

.add-server-btn .el-button:hover {
  background-color: #ecf5ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-col {
    width: 100%;
  }
  
  .server-actions {
    opacity: 1;
  }
}
</style>