<template>
  <div class="sftp-file-manager" :class="{ 'dark-theme': isDark }">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-buttons">
        <el-button size="small" @click="goToParentDirectory" :disabled="currentPath === '/'">
          <el-icon><ArrowUp /></el-icon>
          返回上级
        </el-button>
        <el-button size="small" @click="refreshDirectory">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button size="small" @click="showCreateDirDialog = true">
          <el-icon><FolderAdd /></el-icon>
          新建文件夹
        </el-button>
        <el-button size="small" @click="handleUploadClick">
          <el-icon><Upload /></el-icon>
          上传文件
        </el-button>
        <el-button 
          size="small"
          @click="handleDeleteSelected" 
          :disabled="selectedFiles.size === 0"
          type="danger"
        >
          <el-icon><Delete /></el-icon>
          删除选中
        </el-button>
      </div>
      
      <div class="path-display">
        <span>当前路径:</span>
        <el-input 
          v-model="inputPath" 
          placeholder="输入目录路径并回车" 
          @keyup.enter="handlePathEnter"
          size="small"
          style="width: 300px; margin-left: 10px;"
        >
          <template #append>
            <el-button @click="handlePathEnter"><el-icon><Right /></el-icon></el-button>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list-container">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        加载中...
      </div>
      
      <div v-else-if="error" class="error">
        <el-alert :title="error" type="error" show-icon />
      </div>
      
      <div v-else class="file-list">
        <div 
          v-for="file in files" 
          :key="file.path"
          class="file-item"
          :class="{ 
            'selected': selectedFiles.has(file.path), 
            'directory': file.type === 'directory' 
          }"
          @click="handleFileClick(file)"
          @dblclick="handleFileDoubleClick(file)"
        >
          <div class="file-icon">
            <el-icon v-if="file.type === 'directory'"><Folder /></el-icon>
            <el-icon v-else-if="file.name.endsWith('.txt')"><Document /></el-icon>
            <el-icon v-else-if="file.name.endsWith('.js')"><Document /></el-icon>
            <el-icon v-else-if="file.name.endsWith('.py')"><Document /></el-icon>
            <el-icon v-else><Document /></el-icon>
          </div>
          
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-details">
              <span v-if="file.type === 'file'">{{ formatFileSize(file.size) }}</span>
              <span v-else>目录</span>
              <span>{{ formatDate(file.modified) }}</span>
            </div>
          </div>
          
          <div class="file-actions">
            <el-button 
              v-if="file.type === 'file'" 
              size="small" 
              type="primary" 
              @click.stop="handleEditFile(file)"
            >
              编辑
            </el-button>
            <el-button 
              v-if="file.type === 'file'" 
              size="small" 
              @click.stop="handleDownload(file)"
            >
              下载
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click.stop="handleDelete(file)"
            >
              删除
            </el-button>
          </div>
        </div>
        
        <div v-if="files.length === 0" class="empty-directory">
          <el-empty description="目录为空" />
        </div>
      </div>
    </div>

    <!-- 文件上传输入 -->
    <input 
      ref="fileInput" 
      type="file" 
      multiple 
      style="display: none" 
      @change="handleFileUpload"
    />

    <!-- 上传进度条（极简风格） -->
    <div v-if="isUploading || uploadProgress > 0" class="upload-progress-bar">
      <div class="upload-info">
        <span class="upload-filename">{{ uploadFileName }}</span>
        <span class="upload-size">{{ formatUploadSize(uploadLoaded) }} / {{ formatUploadSize(uploadTotal) }}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
        <span class="progress-label">{{ uploadProgress }}%</span>
      </div>
      <button v-if="isUploading" class="cancel-upload-btn" @click="cancelUpload">取消</button>
      <button v-else-if="uploadProgress === 100" class="done-upload-btn" @click="handleUploadDone">完成</button>
    </div>

    <!-- 上传错误提示 -->
    <div v-if="uploadError" class="upload-error-bar">
      <span>上传失败: {{ uploadError }}</span>
      <button class="retry-upload-btn" @click="resetUpload">关闭</button>
    </div>

    <!-- 对话框 -->
    <el-dialog v-model="showCreateDirDialog" title="新建文件夹" width="400px">
      <el-form :model="createDirForm" label-width="80px">
        <el-form-item label="文件夹名">
          <el-input v-model="createDirForm.name" placeholder="请输入文件夹名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDirDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreateDirectory">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showRenameDialog" title="重命名" width="400px">
      <el-form :model="renameForm" label-width="80px">
        <el-form-item label="新名称">
          <el-input v-model="renameForm.newName" :placeholder="renameForm.oldName" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenameDialog = false">取消</el-button>
        <el-button type="primary" @click="handleRename">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showEditDialog" title="编辑文件" width="80%" fullscreen>
      <div class="editor-container">
        <div class="editor-header">
          <span>正在编辑: {{ editFile.path }}</span>
          <el-button type="primary" @click="handleSaveEdit">保存</el-button>
        </div>
        <vue-monaco-editor
          v-model:value="editFile.content"
          theme="vs-dark"
          :language="getLanguage(editFile.path)"
          :options="{
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: false }
          }"
          class="file-editor-monaco"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage, ElMessageBox } from 'element-plus';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { 
  ArrowUp, Refresh, FolderAdd, Upload, Delete, Loading, 
  Folder, Document, Right
} from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'
import { useSftpUpload } from '@/composables/useSftpUpload'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

// 使用 SFTP 上传 composable（带进度条）
const {
  isUploading,
  uploadProgress,
  uploadLoaded,
  uploadTotal,
  uploadFileName,
  uploadError,
  startUpload,
  cancelUpload,
  resetUpload,
  formatFileSize: formatUploadSize
} = useSftpUpload()

const props = defineProps({
  sftp: {
    type: Object,
    required: true
  }
});

const fileInput = ref(null);

// 响应式数据
const showCreateDirDialog = ref(false);
const showRenameDialog = ref(false);
const showEditDialog = ref(false);

const createDirForm = ref({
  name: ''
});

const renameForm = ref({
  oldPath: '',
  oldName: '',
  newName: ''
});

const editFile = ref({
  path: '',
  content: ''
});

// 计算属性直接从 props.sftp 提取
const currentPath = computed(() => props.sftp.currentPath.value);
const files = computed(() => props.sftp.files.value);
const loading = computed(() => props.sftp.loading.value);
const error = computed(() => props.sftp.error.value);
const selectedFiles = computed(() => props.sftp.selectedFiles.value);

const inputPath = ref(currentPath.value);

// 当 currentPath 变化时，自动更新输入框中的路径
watch(currentPath, (newVal) => {
  inputPath.value = newVal;
});

// 方法
const refreshDirectory = async () => {
  await props.sftp.listDirectory(currentPath.value);
};

const goToParentDirectory = async () => {
  await props.sftp.goToParentDirectory();
};

const handlePathEnter = async () => {
  const target = inputPath.value.trim();
  if (!target) {
    ElMessage.warning('请输入有效路径');
    return;
  }
  
  if (target === currentPath.value) {
    await refreshDirectory(); // 路径没变时相当于刷新
    return;
  }

  try {
    // 假设 listDirectory 能够处理绝对路径并进入
    await props.sftp.listDirectory(target);
  } catch (err) {
    ElMessage.error('无法进入该目录: ' + err.message);
    // 回退到原来的路径显示
    inputPath.value = currentPath.value;
  }
};

const handleFileClick = (file) => {
  props.sftp.toggleFileSelection(file.path);
};

const handleFileDoubleClick = async (file) => {
  if (file.type === 'directory') {
    await props.sftp.enterDirectory(file.name);
  } else {
    handleEditFile(file);
  }
};

const handleEditFile = async (file) => {
  try {
    const content = await props.sftp.readFile(file.path);
    editFile.value = {
      path: file.path,
      content: content
    };
    showEditDialog.value = true;
  } catch (err) {
    ElMessage.error('读取文件失败: ' + err.message);
  }
};

const getLanguage = (path) => {
  if (!path) return 'plaintext';
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript', ts: 'typescript', vue: 'html', html: 'html', css: 'css',
    json: 'json', py: 'python', java: 'java', c: 'c', cpp: 'cpp', 
    md: 'markdown', txt: 'plaintext', sh: 'shell', yaml: 'yaml', yml: 'yaml',
    conf: 'ini', ini: 'ini', xml: 'xml', sql: 'sql', php: 'php', rb: 'ruby',
    go: 'go', rs: 'rust', pb: 'protobuf'
  };
  return map[ext] || 'plaintext';
};

const handleDownload = async (file) => {
  try {
    await props.sftp.downloadFile(file.path, file.name);
    ElMessage.success('下载成功');
  } catch (err) {
    ElMessage.error('下载失败: ' + err.message);
  }
};

const handleDelete = async (file) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${file.type === 'directory' ? '目录' : '文件'} "${file.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await props.sftp.deleteItem(file.path, file.type);
    ElMessage.success('删除成功');
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败: ' + err.message);
    }
  }
};

const handleDeleteSelected = async () => {
  try {
    const count = selectedFiles.value.size;
    await ElMessageBox.confirm(
      `确定要删除选中的 ${count} 个项目吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    for (const filePath of selectedFiles.value) {
      const file = files.value.find(f => f.path === filePath);
      if (file) {
        await props.sftp.deleteItem(file.path, file.type);
      }
    }
    
    ElMessage.success(`成功删除 ${count} 个项目`);
    props.sftp.clearSelection();
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败: ' + err.message);
    }
  }
};

const handleUploadClick = () => {
  fileInput.value.click();
};

/**
 * 处理文件选择 - 使用 WebSocket 实现带进度条的上传
 * Electron 环境：直接获取本地文件路径，后端流式读取并上传
 */
const handleFileUpload = async (event) => {
  const filesList = Array.from(event.target.files);
  if (filesList.length === 0) return;

  // 逐个上传文件
  for (const file of filesList) {
    try {
      // Electron 环境：file.path 是本地文件的绝对路径
      // Web 环境无法获取绝对路径，需要用户手动输入或使用其他方式
      const localPath = file.path || file.name;
      
      // 构建远程目标路径
      const remotePath = currentPath.value === '/'
        ? `/${file.name}`
        : `${currentPath.value}/${file.name}`;

      // 使用 WebSocket 上传（带进度条）
      await startUpload(props.sftp.sessionId.value, localPath, remotePath);
      
    } catch (err) {
      ElMessage.error(`文件 ${file.name} 上传失败: ` + err.message);
    }
  }
  
  event.target.value = '';
};

/**
 * 上传完成后刷新目录
 */
const handleUploadDone = () => {
  resetUpload();
  refreshDirectory();
  ElMessage.success('文件上传成功');
};

const handleCreateDirectory = async () => {
  if (!createDirForm.value.name.trim()) {
    ElMessage.warning('请输入文件夹名称');
    return;
  }
  
  try {
    await props.sftp.createDirectory(createDirForm.value.name.trim());
    ElMessage.success('文件夹创建成功');
    showCreateDirDialog.value = false;
    createDirForm.value.name = '';
  } catch (err) {
    ElMessage.error('创建文件夹失败: ' + err.message);
  }
};

const handleRename = async () => {
  if (!renameForm.value.newName.trim()) {
    ElMessage.warning('请输入新名称');
    return;
  }
  
  try {
    await props.sftp.renameItem(renameForm.value.oldPath, renameForm.value.newName.trim());
    ElMessage.success('重命名成功');
    showRenameDialog.value = false;
    renameForm.value = {
      oldPath: '',
      oldName: '',
      newName: ''
    };
  } catch (err) {
    ElMessage.error('重命名失败: ' + err.message);
  }
};

const handleSaveEdit = async () => {
  try {
    await props.sftp.saveFile(editFile.value.path, editFile.value.content);
    ElMessage.success('文件保存成功');
    showEditDialog.value = false;
  } catch (err) {
    ElMessage.error('保存文件失败: ' + err.message);
  }
};

// 工具函数
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString();
};

onMounted(() => {
  if (props.sftp.isConnected.value) {
    props.sftp.listDirectory(props.sftp.currentPath.value);
  }
});
</script>

<style scoped>
.sftp-file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #303133;
  transition: all 0.3s ease;
}

.dark-theme .sftp-file-manager {
  color: #ffffff;
}

.toolbar {
  padding: 10px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  transition: all 0.3s ease;
}

.dark-theme .toolbar {
  background-color: rgba(30, 30, 30, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.toolbar-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-buttons .el-button {
  width: 120px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  line-height: 32px;
  padding: 0 12px;
}

.path-display {
  margin-left: auto;
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.file-list-container {
  flex: 1;
  overflow: auto;
}

.loading, .error {
  padding: 20px;
  text-align: center;
}

.file-list {
  padding: 10px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: all 0.2s;
  color: #303133;
  background-color: #ffffff;
}

.dark-theme .file-item {
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.file-item:hover {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
}

.dark-theme .file-item:hover {
  background-color: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.file-item.selected {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.dark-theme .file-item.selected {
  background-color: rgba(0, 122, 255, 0.2);
  border-color: #007AFF;
}

.file-item.directory {
  font-weight: bold;
}

.dark-theme .file-item.directory .file-name {
  color: #ffffff;
}

.file-icon {
  margin-right: 10px;
  font-size: 20px;
  color: #409eff;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  margin-bottom: 4px;
  color: #303133;
}

.dark-theme .file-name {
  color: #ffffff !important;
}

.file-details {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #606266;
}

.dark-theme .file-details {
  color: #98989d;
}

.file-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .file-actions {
  opacity: 1;
}

.empty-directory {
  text-align: center;
  padding: 40px;
  color: #909399;
}

.dark-theme .empty-directory {
  color: #98989d;
}

.editor-container {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.editor-header {
  padding: 10px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.dark-theme .editor-header {
  background-color: rgba(30, 30, 30, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.file-editor-monaco {
  flex: 1;
  min-height: 0;
}

/* 上传进度条样式 - 极简终端风格 */
.upload-progress-bar {
  padding: 12px 16px;
  background: #f0f7ff;
  border-bottom: 1px solid #d0e4ff;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dark-theme .upload-progress-bar {
  background: rgba(0, 50, 100, 0.3);
  border-bottom: 1px solid rgba(0, 122, 255, 0.3);
}

.upload-info {
  display: flex;
  flex-direction: column;
  min-width: 200px;
  flex: 1;
}

.upload-filename {
  font-weight: 500;
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark-theme .upload-filename {
  color: #e0e0e0;
}

.upload-size {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.dark-theme .upload-size {
  color: #888;
}

.progress-track {
  flex: 2;
  min-width: 200px;
  height: 20px;
  background: #e0e0e0;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.dark-theme .progress-track {
  background: #3c3c3c;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.dark-theme .progress-label {
  color: #e0e0e0;
}

.cancel-upload-btn,
.done-upload-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-upload-btn {
  background: #f44336;
  color: #fff;
}

.cancel-upload-btn:hover {
  background: #d32f2f;
}

.done-upload-btn {
  background: #4caf50;
  color: #fff;
}

.done-upload-btn:hover {
  background: #388e3c;
}

/* 上传错误提示 */
.upload-error-bar {
  padding: 10px 16px;
  background: #ffebee;
  border-bottom: 1px solid #ffcdd2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #c62828;
}

.dark-theme .upload-error-bar {
  background: rgba(100, 30, 30, 0.3);
  border-bottom: 1px solid rgba(200, 50, 50, 0.3);
  color: #ef9a9a;
}

.retry-upload-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: #ff9800;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-upload-btn:hover {
  background: #f57c00;
}
</style>
