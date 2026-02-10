<template>
  <div class="quick-connect-page">
    <el-container class="quick-connect-container">
      <!-- 顶部工具栏 -->
      <el-header class="quick-connect-header">
        <div class="header-left">
          <el-button @click="$router.back()" size="small">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="page-title">快速连接</span>
        </div>
      </el-header>
      
      <!-- 主内容区域 -->
      <el-main class="quick-connect-main">
        <div class="connect-form-container">
          <el-card class="connect-card">
            <template #header>
              <div class="card-header">
                <h3>SSH连接信息</h3>
                <p>输入服务器信息进行一次性连接（不保存）</p>
              </div>
            </template>
            
            <el-form :model="form" :rules="rules" ref="connectForm" label-width="100px">
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
          
          <!-- 快速连接示例 -->
          <el-card class="examples-card">
            <template #header>
              <div class="card-header">
                <h3>连接示例</h3>
              </div>
            </template>
            
            <div class="examples">
              <div class="example-item" @click="fillExample('ubuntu')">
                <h4>Ubuntu服务器</h4>
                <p>主机: 192.168.1.100</p>
                <p>端口: 22</p>
                <p>用户: ubuntu</p>
              </div>
              
              <div class="example-item" @click="fillExample('centos')">
                <h4>CentOS服务器</h4>
                <p>主机: 192.168.1.101</p>
                <p>端口: 22</p>
                <p>用户: root</p>
              </div>
              
              <div class="example-item" @click="fillExample('docker')">
                <h4>Docker容器</h4>
                <p>主机: localhost</p>
                <p>端口: 2222</p>
                <p>用户: root</p>
              </div>
            </div>
          </el-card>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Connection } from '@element-plus/icons-vue'
import { useTerminalStore } from '@/stores/terminal'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const terminalStore = useTerminalStore()
const authStore = useAuthStore()

const connectForm = ref()
const connecting = ref(false)
const connectionError = ref('')

const form = reactive({
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

// 处理连接
const handleConnect = async () => {
  if (!connectForm.value) return
  
  try {
    const valid = await connectForm.value.validate()
    if (!valid) return
    
    if (!authStore.token) {
      ElMessage.error('请先登录')
      return
    }

    // 初始化Socket连接
    if (!terminalStore.socket) {
      terminalStore.connectSocket(authStore.token)
    }

    connecting.value = true
    connectionError.value = ''
    
    const connectionInfo = {
      host: form.host,
      port: form.port,
      username: form.username
    }
    
    if (form.authType === 'password') {
      connectionInfo.password = form.password
    } else {
      connectionInfo.privateKey = form.privateKey
    }
    
    // 执行快速连接
    terminalStore.quickConnect(connectionInfo)
    
    // 监听连接状态
    const checkConnection = setInterval(() => {
      if (terminalStore.isConnected) {
        clearInterval(checkConnection)
        connecting.value = false
        ElMessage.success('连接成功')
        // 跳转到终端页面
        router.push('/terminal')
      } else if (terminalStore.connectionError) {
        clearInterval(checkConnection)
        connecting.value = false
        connectionError.value = terminalStore.connectionError
      }
    }, 500)
    
    // 超时检查
    setTimeout(() => {
      if (connecting.value) {
        clearInterval(checkConnection)
        connecting.value = false
        connectionError.value = '连接超时，请检查网络和服务器状态'
      }
    }, 15000)
    
  } catch (error) {
    connecting.value = false
    ElMessage.error('连接失败，请重试')
  }
}

// 填充示例数据
const fillExample = (type) => {
  const examples = {
    ubuntu: {
      host: '192.168.1.100',
      port: 22,
      username: 'ubuntu',
      authType: 'password',
      password: ''
    },
    centos: {
      host: '192.168.1.101',
      port: 22,
      username: 'root',
      authType: 'password',
      password: ''
    },
    docker: {
      host: 'localhost',
      port: 2222,
      username: 'root',
      authType: 'password',
      password: ''
    }
  }
  
  Object.assign(form, examples[type])
  ElMessage.info(`已填充${type}示例配置，请填写密码后连接`)
}

onMounted(() => {
  // 组件挂载时的初始化
})
</script>

<style scoped>
.quick-connect-page {
  height: 100vh;
  background-color: #f5f5f5;
}

.quick-connect-container {
  height: 100%;
}

.quick-connect-header {
  background: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.quick-connect-main {
  padding: 40px;
  display: flex;
  justify-content: center;
}

.connect-form-container {
  width: 100%;
  max-width: 600px;
}

.connect-card,
.examples-card {
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.card-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.connection-error,
.connecting-status {
  margin-top: 20px;
}

.examples {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.example-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.example-item:hover {
  border-color: #409eff;
  background-color: #f5f7fa;
  transform: translateY(-2px);
}

.example-item h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 14px;
}

.example-item p {
  margin: 4px 0;
  color: #666;
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .quick-connect-main {
    padding: 20px;
  }
  
  .examples {
    grid-template-columns: 1fr;
  }
}
</style>