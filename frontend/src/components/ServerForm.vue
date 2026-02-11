<template>
  <el-form :model="form" :rules="rules" ref="serverForm" label-width="100px">
    <el-form-item label="服务器名称" prop="name">
      <el-input v-model="form.name" placeholder="请输入服务器名称" />
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
    
    <el-form-item label="分组" prop="groupName">
      <el-select v-model="form.groupName" placeholder="请选择分组" style="width: 100%" @change="handleGroupChange">
        <el-option v-for="group in existingGroups" :key="group" :label="group" :value="group" />
        <el-option label="新建分组" value="" style="color: #409eff; font-weight: bold;">
          <span style="color: #409eff; font-weight: bold;">+ 新建分组</span>
        </el-option>
      </el-select>
      <div v-if="form.groupName === ''" style="margin-top: 8px;">
        <el-input 
          v-model="newGroupName" 
          placeholder="请输入新分组名称" 
          ref="newGroupInput" 
          @blur="handleNewGroupBlur"
        />
      </div>
    </el-form-item>
    
    <el-form-item>
      <el-button type="primary" @click="handleSubmit">保存</el-button>
      <el-button v-if="serverId" type="success" :loading="testingConnection" @click="handleTestConnection">
        <el-icon><Connection /></el-icon>
        测试连接
      </el-button>
      <el-button @click="$emit('cancel')">取消</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { useServersStore } from '@/stores/servers'

const props = defineProps({
  serverId: {
    type: Number,
    default: null
  },
  groupName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['success', 'cancel'])

const serversStore = useServersStore()
const serverForm = ref()
const loading = ref(false)
const testingConnection = ref(false)
const newGroupName = ref('')
const newGroupInput = ref()

const form = reactive({
  name: '',
  host: '',
  port: 22,
  username: '',
  authType: 'password',
  password: '',
  privateKey: '',
  groupName: props.groupName || 'Default'
})

// 获取分组列表
const existingGroups = computed(() => {
  return serversStore.groups.map(group => group.name)
})

const rules = {
  name: [
    { required: true, message: '请输入服务器名称', trigger: 'blur' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { 
      required: !props.serverId, // 编辑模式下非必填
      message: '请输入密码', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.authType === 'password' && !value && !props.serverId) {
          callback(new Error('请输入密码'))
        } else {
          callback()
        }
      }
    }
  ],
  privateKey: [
    { 
      required: !props.serverId, // 编辑模式下非必填
      message: '请输入私钥', 
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.authType === 'key' && !value && !props.serverId) {
          callback(new Error('请输入私钥'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 监听认证方式变化，清空另一个认证字段
watch(() => form.authType, (newVal) => {
  if (newVal === 'password') {
    form.privateKey = ''
  } else {
    form.password = ''
  }
})

// 监听新建分组名称变化 - 移除自动更新，改为手动触发

// 监听分组选择变化
watch(() => form.groupName, (newGroup) => {
  if (newGroup && newGroup !== '') {
    newGroupName.value = ''
  }
})

// 处理分组选择变化
const handleGroupChange = (selectedGroup) => {
  if (selectedGroup === '' && newGroupInput.value) {
    // 选择"新建分组"时，延迟聚焦到输入框，确保DOM已更新
    nextTick(() => {
      if (newGroupInput.value) {
        newGroupInput.value.focus()
      }
    })
  }
}

// 处理新建分组输入框失去焦点
const handleNewGroupBlur = () => {
  if (newGroupName.value && form.groupName === '') {
    form.groupName = newGroupName.value
  }
}

// 加载服务器数据（编辑模式）
const loadServerData = async () => {
  if (!props.serverId) return
  
  loading.value = true
  try {
    // 确保服务器列表已加载
    if (serversStore.servers.length === 0) {
      await serversStore.fetchServers()
    }
    
    const result = await serversStore.getServerCredentials(props.serverId)
    if (result.success) {
      const { server, credentials } = result.data
      
      form.name = server.name
      form.host = server.host
      form.port = server.port
      form.username = server.username
      form.authType = server.authType
      form.groupName = server.group_name || server.groupName || 'Default'
      
      if (server.authType === 'password') {
        form.password = credentials.password || ''
      } else if (server.authType === 'key') {
        form.privateKey = credentials.privateKey || ''
      }
    } else {
      ElMessage.error(result.error)
    }
  } catch (error) {
    ElMessage.error('加载服务器数据失败')
  } finally {
    loading.value = false
  }
}

// 监听分组数据变化，确保分组选择器有正确的数据
watch(() => serversStore.groups, (newGroups) => {
  if (newGroups.length > 0 && !props.serverId) {
    // 添加模式下，确保分组数据正确设置
    if (props.groupName) {
      form.groupName = props.groupName
    } else {
      form.groupName = newGroups[0].name
    }
  }
}, { immediate: true })

// 监听serverId变化，确保每次打开编辑对话框都重新加载数据
watch(() => props.serverId, (newServerId) => {
  if (newServerId) {
    // 重置表单数据，确保重新加载
    Object.keys(form).forEach(key => {
      if (key === 'port') {
        form[key] = 22
      } else if (key === 'authType') {
        form[key] = 'password'
      } else if (key === 'groupName') {
        // 编辑模式下重置为默认值
        form[key] = 'Default'
      } else {
        form[key] = ''
      }
    })
    newGroupName.value = ''
    
    // 延迟加载数据，确保DOM已更新
    setTimeout(() => {
      loadServerData()
    }, 0)
  } else {
    // 添加模式下，确保分组数据正确设置
    if (props.groupName) {
      form.groupName = props.groupName
    } else if (serversStore.groups.length > 0) {
      form.groupName = serversStore.groups[0].name
    }
  }
}, { immediate: true })

// 组件挂载时加载数据
onMounted(async () => {
  // 确保分组数据已加载
  if (serversStore.groups.length === 0) {
    await serversStore.fetchGroups()
  }
  
  // 添加模式下，确保分组数据正确设置
  if (!props.serverId) {
    // 如果传入了分组名称，使用传入的分组
    if (props.groupName) {
      form.groupName = props.groupName
    }
    // 如果没有分组数据，确保至少有一个默认分组
    else if (serversStore.groups.length > 0) {
      form.groupName = serversStore.groups[0].name
    }
  }
})

// 测试服务器连接
const handleTestConnection = async () => {
  // 验证表单必填字段
  if (!form.host || !form.username) {
    ElMessage.warning('请填写主机地址和用户名')
    return
  }
  
  // 验证认证信息
  if (form.authType === 'password' && !form.password) {
    ElMessage.warning('请填写密码')
    return
  }
  
  if (form.authType === 'key' && !form.privateKey) {
    ElMessage.warning('请填写私钥')
    return
  }
  
  testingConnection.value = true
  try {
    // 准备连接测试数据
    const connectionData = {
      host: form.host,
      port: form.port,
      username: form.username,
      authType: form.authType,
      password: form.password,
      privateKey: form.privateKey
    }
    
    const result = await serversStore.testConnection(connectionData)
    if (result.success) {
      ElMessage.success(result.data.message || '连接测试成功')
    } else {
      ElMessage.error(result.error || '连接测试失败')
    }
  } catch (error) {
    ElMessage.error('连接测试失败，请重试')
  } finally {
    testingConnection.value = false
  }
}

const handleSubmit = async () => {
  if (!serverForm.value) return
  
  try {
    const valid = await serverForm.value.validate()
    if (!valid) return
    
    // 处理分组名称：如果选择了"新建分组"，使用新输入的分组名
    let finalGroupName = form.groupName
    if (form.groupName === '' && newGroupName.value) {
      finalGroupName = newGroupName.value
    }
    
    const serverData = {
      name: form.name,
      host: form.host,
      port: form.port,
      username: form.username,
      authType: form.authType,
      groupName: finalGroupName || 'Default'
    }
    
    // 只有在提供了新密码或私钥时才更新认证信息
    if (form.authType === 'password' && form.password) {
      serverData.password = form.password
    } else if (form.authType === 'key' && form.privateKey) {
      serverData.privateKey = form.privateKey
    }
    
    let result
    if (props.serverId) {
      // 编辑模式
      result = await serversStore.updateServer(props.serverId, serverData)
    } else {
      // 添加模式
      result = await serversStore.addServer(serverData)
    }
    
    if (result.success) {
      ElMessage.success(props.serverId ? '服务器更新成功' : '服务器添加成功')
      
      // 重置表单（仅在添加模式）
      if (!props.serverId) {
        Object.keys(form).forEach(key => {
          if (key === 'port') {
            form[key] = 22
          } else if (key === 'authType') {
            form[key] = 'password'
          } else if (key === 'groupName') {
            form[key] = 'Default'
          } else {
            form[key] = ''
          }
        })
        newGroupName.value = ''
      }
      
      emit('success')
    } else {
      ElMessage.error(result.error)
    }
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  }
}
</script>