<template>
  <div class="user-management-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>用户管理</h1>
      <div class="header-actions">
        <el-button @click="goToDashboard">
          <el-icon><House /></el-icon>
          返回主页
        </el-button>
        <el-button type="primary" @click="showCreateUserDialog = true">
          <el-icon><Plus /></el-icon>
          添加用户
        </el-button>
        <el-button @click="refreshUsers">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索邮箱或手机号"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable @change="handleFilter">
            <el-option label="全部" value=""></el-option>
            <el-option label="已激活" value="active"></el-option>
            <el-option label="已禁用" value="inactive"></el-option>
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterRole" placeholder="角色筛选" clearable @change="handleFilter">
            <el-option label="全部" value=""></el-option>
            <el-option label="管理员" value="admin"></el-option>
            <el-option label="普通用户" value="user"></el-option>
          </el-select>
        </el-col>
      </el-row>
    </div>

    <!-- 用户列表 -->
    <div class="user-table-container">
      <el-table
        :data="filteredUsers"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="server_count" label="服务器数量" width="120" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-primary': row.server_count > 0 }">{{ row.server_count }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="last_login" label="最后登录" width="160">
          <template #default="{ row }">
            <span v-if="row.last_login">{{ formatDate(row.last_login) }}</span>
            <span v-else class="text-muted">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.is_active ? 'success' : 'danger'"
              size="small"
            >
              {{ row.is_active ? '已激活' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.is_admin ? 'warning' : ''"
              size="small"
            >
              {{ row.is_admin ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              @click="handleViewUser(row)"
            >
              查看
            </el-button>
            <el-button 
              size="small" 
              type="primary"
              @click="handleEditUser(row)"
            >
              编辑
            </el-button>
            <el-button 
              v-if="row.id !== authStore.user?.id"
              size="small" 
              type="danger"
              @click="handleDeleteUser(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="totalUsers"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 添加用户对话框 -->
    <el-dialog 
      v-model="showCreateUserDialog" 
      title="添加用户" 
      width="500px"
      :before-close="handleCloseCreateDialog"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="createForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="createForm.phone" placeholder="请输入手机号（可选）" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input 
            v-model="createForm.password" 
            type="password" 
            placeholder="请输入密码" 
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input 
            v-model="createForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码" 
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="is_admin">
          <el-radio-group v-model="createForm.is_admin">
            <el-radio :label="false">普通用户</el-radio>
            <el-radio :label="true">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" prop="is_active">
          <el-radio-group v-model="createForm.is_active">
            <el-radio :label="true">激活</el-radio>
            <el-radio :label="false">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseCreateDialog">取消</el-button>
        <el-button type="primary" @click="handleCreateUser" :loading="creating">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户对话框 -->
    <el-dialog 
      v-model="showEditUserDialog" 
      :title="'编辑用户 - ' + (editingUser?.email || '')" 
      width="500px"
      :before-close="handleCloseEditDialog"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="editForm.phone" />
        </el-form-item>
        <el-form-item label="角色" prop="is_admin">
          <el-radio-group v-model="editForm.is_admin">
            <el-radio :label="false">普通用户</el-radio>
            <el-radio :label="true">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" prop="is_active">
          <el-radio-group v-model="editForm.is_active">
            <el-radio :label="true">激活</el-radio>
            <el-radio :label="false">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseEditDialog">取消</el-button>
        <el-button type="success" @click="handleResetPassword" :loading="resetting">
          重置密码
        </el-button>
        <el-button type="primary" @click="handleUpdateUser" :loading="updating">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 用户详情对话框 -->
    <el-dialog 
      v-model="showUserDetailDialog" 
      :title="'用户详情 - ' + (selectedUser?.email || '')" 
      width="600px"
    >
      <div v-if="selectedUser" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ selectedUser.id }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ selectedUser.email }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ selectedUser.phone || '未设置' }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="selectedUser.is_admin ? 'warning' : ''">
              {{ selectedUser.is_admin ? '管理员' : '普通用户' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedUser.is_active ? 'success' : 'danger'">
              {{ selectedUser.is_active ? '已激活' : '已禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="服务器数量">{{ selectedUser.server_count || 0 }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">
            {{ selectedUser.last_login ? formatDate(selectedUser.last_login) : '从未登录' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedUser.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(selectedUser.updated_at) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 服务器列表 -->
        <div v-if="userServers.length > 0" class="server-list">
          <h3>服务器列表</h3>
          <el-table :data="userServers" size="small">
            <el-table-column prop="name" label="服务器名称" />
            <el-table-column prop="host" label="主机地址" />
            <el-table-column prop="port" label="端口" width="80" />
            <el-table-column prop="auth_type" label="认证方式" width="100" />
            <el-table-column prop="group_name" label="分组" />
          </el-table>
        </div>

        <!-- 连接统计 -->
        <div v-if="connectionStats" class="connection-stats">
          <h3>连接统计</h3>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="总连接数">{{ connectionStats.total_connections || 0 }}</el-descriptions-item>
            <el-descriptions-item label="总时长">{{ connectionStats.total_duration || 0 }}秒</el-descriptions-item>
            <el-descriptions-item label="最后连接">
              {{ connectionStats.last_connection ? formatDate(connectionStats.last_connection) : '无' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog 
      v-model="showResetPasswordDialog" 
      title="重置密码" 
      width="400px"
    >
      <el-form
        ref="resetFormRef"
        :model="resetForm"
        :rules="resetRules"
        label-width="100px"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="resetForm.newPassword" 
            type="password" 
            placeholder="请输入新密码" 
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input 
            v-model="resetForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码" 
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetPasswordDialog = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmResetPassword" :loading="resetting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search, House } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const authStore = useAuthStore()

// 响应式数据
const loading = ref(false)
const creating = ref(false)
const updating = ref(false)
const resetting = ref(false)
const users = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const totalUsers = ref(0)

// 筛选条件
const searchKeyword = ref('')
const filterStatus = ref('')
const filterRole = ref('')

// 对话框状态
const showCreateUserDialog = ref(false)
const showEditUserDialog = ref(false)
const showUserDetailDialog = ref(false)
const showResetPasswordDialog = ref(false)

// 表单数据
const createForm = reactive({
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  is_admin: false,
  is_active: true
})

const editForm = reactive({
  email: '',
  phone: '',
  is_admin: false,
  is_active: true
})

const resetForm = reactive({
  newPassword: '',
  confirmPassword: ''
})

// 当前操作的用户
const selectedUser = ref(null)
const editingUser = ref(null)
const userServers = ref([])
const connectionStats = ref(null)

// 表单引用
const createFormRef = ref()
const editFormRef = ref()
const resetFormRef = ref()

// 表单验证规则
const createRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== createForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const editRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const resetRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== resetForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 计算属性：筛选后的用户列表
const filteredUsers = computed(() => {
  let filtered = users.value
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(user => 
      user.email.toLowerCase().includes(keyword) ||
      (user.phone && user.phone.includes(keyword))
    )
  }
  
  // 状态筛选
  if (filterStatus.value) {
    filtered = filtered.filter(user => 
      filterStatus.value === 'active' ? user.is_active : !user.is_active
    )
  }
  
  // 角色筛选
  if (filterRole.value) {
    filtered = filtered.filter(user => 
      filterRole.value === 'admin' ? user.is_admin : !user.is_admin
    )
  }
  
  return filtered
})

// 日期格式化
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 获取用户列表
const fetchUsers = async () => {
  try {
    loading.value = true
    const response = await api.get('/users')
    console.log('获取用户列表响应:', response)
    if (response && response.users) {
      users.value = response.users
      totalUsers.value = users.value.length
      console.log('用户数据已更新:', users.value)
    } else {
      console.warn('获取用户列表响应格式不正确:', response)
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 获取用户详情
const fetchUserDetail = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`)
    if (response.data) {
      selectedUser.value = response.data.user
      userServers.value = response.data.servers || []
      connectionStats.value = response.data.connection_stats || {}
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    ElMessage.error('获取用户详情失败')
  }
}

// 创建用户
const handleCreateUser = async () => {
  try {
    await createFormRef.value.validate()
    creating.value = true
    
    const response = await api.post('/users', {
      email: createForm.email,
      phone: createForm.phone || null,
      password: createForm.password,
      is_admin: createForm.is_admin
    })
    
    ElMessage.success(response.message || '用户创建成功')
    handleCloseCreateDialog()
    fetchUsers()
  } catch (error) {
    console.error('创建用户失败:', error)
    if (error.response?.data?.error) {
      ElMessage.error(error.response.data.error)
    } else {
      ElMessage.error('创建用户失败')
    }
  } finally {
    creating.value = false
  }
}

// 更新用户
const handleUpdateUser = async () => {
  try {
    await editFormRef.value.validate()
    updating.value = true
    
    const response = await api.put(`/users/${editingUser.value.id}`, {
      email: editForm.email,
      phone: editForm.phone || null,
      is_admin: editForm.is_admin,
      is_active: editForm.is_active
    })
    
    ElMessage.success(response.message || '用户信息更新成功')
    handleCloseEditDialog()
    fetchUsers()
  } catch (error) {
    console.error('更新用户失败:', error)
    if (error.response?.data?.error) {
      ElMessage.error(error.response.data.error)
    } else {
      ElMessage.error('更新用户失败')
    }
  } finally {
    updating.value = false
  }
}

// 重置密码
const handleResetPassword = () => {
  showResetPasswordDialog.value = true
}

const handleConfirmResetPassword = async () => {
  try {
    await resetFormRef.value.validate()
    resetting.value = true
    
    const response = await api.put(`/users/${editingUser.value.id}/password`, {
      newPassword: resetForm.newPassword
    })
    
    ElMessage.success(response.message || '密码重置成功')
    showResetPasswordDialog.value = false
    resetForm.newPassword = ''
    resetForm.confirmPassword = ''
  } catch (error) {
    console.error('重置密码失败:', error)
    if (error.response?.data?.error) {
      ElMessage.error(error.response.data.error)
    } else {
      ElMessage.error('重置密码失败')
    }
  } finally {
    resetting.value = false
  }
}

// 删除用户
const handleDeleteUser = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.email}" 吗？此操作将删除该用户的所有数据且不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await api.delete(`/users/${user.id}`)
    if (response.data) {
      ElMessage.success('用户删除成功')
      fetchUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      if (error.response?.data?.error) {
        ElMessage.error(error.response.data.error)
      } else {
        ElMessage.error('删除用户失败')
      }
    }
  }
}

// 查看用户详情
const handleViewUser = async (user) => {
  selectedUser.value = user
  await fetchUserDetail(user.id)
  showUserDetailDialog.value = true
}

// 编辑用户
const handleEditUser = (user) => {
  editingUser.value = user
  Object.assign(editForm, {
    email: user.email,
    phone: user.phone || '',
    is_admin: user.is_admin === 1,
    is_active: user.is_active === 1
  })
  showEditUserDialog.value = true
}

// 对话框关闭处理
const handleCloseCreateDialog = () => {
  showCreateUserDialog.value = false
  createFormRef.value?.resetFields()
  Object.assign(createForm, {
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    is_admin: false,
    is_active: true
  })
}

const handleCloseEditDialog = () => {
  showEditUserDialog.value = false
  editingUser.value = null
}

// 搜索和筛选处理
const handleSearch = () => {
  currentPage.value = 1
}

const handleFilter = () => {
  currentPage.value = 1
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

// 刷新用户列表
const refreshUsers = () => {
  fetchUsers()
}

// 返回主页
const goToDashboard = () => {
  window.location.href = '/'
}

// 生命周期
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-management-container {
  padding: 20px;
  background: #f5f5f5;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h1 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-table-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.user-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.server-list,
.connection-stats {
  margin-top: 20px;
}

.server-list h3,
.connection-stats h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
}

.text-primary {
  color: #409eff;
  font-weight: 600;
}

.text-muted {
  color: #999;
}
</style>