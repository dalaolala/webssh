<template>
  <div 
    class="sftp-file-manager" 
    :class="{ 'dark-theme': isDark, 'drag-over': isDragOver }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 拖拽上传遮罩层 -->
    <div v-if="isDragOver" class="drag-overlay">
      <div class="drag-content">
        <el-icon class="drag-icon"><Upload /></el-icon>
        <p class="drag-text">释放文件到此处上传</p>
        <p class="drag-hint">文件将上传到: {{ currentPath }}</p>
      </div>
    </div>

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

    <!-- 多文件上传进度区域 -->
    <div v-if="uploadTasks.length > 0" class="upload-progress-area">
      <!-- 顶部汇总信息 -->
      <div class="upload-summary">
        <span class="summary-text">
          <template v-if="isUploading">
            正在上传 {{ uploadingCount }} 个文件...
          </template>
          <template v-else>
            上传完成
          </template>
        </span>
        <div class="summary-actions">
          <button v-if="isUploading" class="cancel-all-btn" @click="cancelAllUploads">全部取消</button>
          <button v-else class="clear-all-btn" @click="handleUploadDone">完成并刷新</button>
        </div>
      </div>

      <!-- 每个文件的进度条 -->
      <div class="upload-tasks-list">
        <div 
          v-for="task in uploadTasks" 
          :key="task.uploadId" 
          class="upload-task-item"
          :class="task.status"
        >
          <div class="task-info">
            <span class="task-filename">{{ task.fileName }}</span>
            <span class="task-status">{{ getStatusText(task) }}</span>
          </div>
          
          <div class="task-progress">
            <div class="progress-track-mini">
              <div 
                class="progress-fill-mini" 
                :style="{ width: task.progress + '%' }"
                :class="task.status"
              ></div>
            </div>
            <span class="progress-percent">{{ task.progress }}%</span>
            <span v-if="task.loaded && task.total" class="progress-size">
              {{ formatUploadSize(task.loaded) }} / {{ formatUploadSize(task.total) }}
            </span>
          </div>

          <!-- 任务操作按钮 -->
          <div class="task-actions">
            <button 
              v-if="task.status === 'uploading'" 
              class="task-cancel-btn" 
              @click="cancelUpload(task.uploadId)"
            >取消</button>
            <button 
              v-if="task.status === 'error'" 
              class="task-retry-btn"
              @click="removeTask(task.uploadId)"
            >关闭</button>
            <!-- 冲突状态：显示覆盖/取消按钮 -->
            <template v-if="task.status === 'conflict'">
              <button 
                class="task-overwrite-btn" 
                @click="handleConfirmOverwrite(task)"
              >覆盖</button>
              <button 
                class="task-cancel-btn" 
                @click="cancelConflict(task.uploadId)"
              >取消</button>
            </template>
          </div>

          <!-- 冲突信息 -->
          <div v-if="task.status === 'conflict' && task.conflictInfo" class="task-conflict-info">
            <el-icon><Warning /></el-icon>
            <span>
              远程文件已存在 ({{ formatUploadSize(task.conflictInfo.remoteSize) }})，
              本地文件 ({{ formatUploadSize(task.conflictInfo.localSize) }})
            </span>
          </div>

          <!-- 错误信息 -->
          <div v-if="task.error" class="task-error">{{ task.error }}</div>
        </div>
      </div>
    </div>

    <!-- 下载进度区域 -->
    <div v-if="downloadTasks.length > 0" class="download-progress-area">
      <!-- 顶部汇总信息 -->
      <div class="download-summary">
        <span class="summary-text">
          <el-icon class="summary-icon"><Download /></el-icon>
          下载中 ({{ downloadTasks.filter(t => t.status === 'downloading' || t.status === 'paused').length }} 个文件)
        </span>
        <div class="summary-actions">
          <button class="clear-all-btn" @click="clearCompletedDownloadTasks">清除已完成</button>
        </div>
      </div>

      <!-- 每个文件的进度条 -->
      <div class="download-tasks-list">
        <div 
          v-for="task in downloadTasks" 
          :key="task.taskId" 
          class="download-task-item"
          :class="task.status"
        >
          <div class="task-info">
            <span class="task-filename">{{ task.fileName }}</span>
            <span class="task-status">
              {{ 
                task.status === 'downloading' ? '下载中' : 
                (task.status === 'paused' ? '已暂停' : 
                (task.status === 'completed' ? '已完成' : 
                (task.status === 'cancelled' ? '已取消' : '失败'))) 
              }}
            </span>
          </div>
          
          <div class="task-progress">
            <div class="progress-track-mini download-track">
              <div 
                class="progress-fill-mini download-fill" 
                :style="{ width: task.progress + '%' }"
                :class="task.status"
              ></div>
            </div>
            <span class="progress-percent">{{ task.progress }}%</span>
            <span v-if="task.loaded && task.total" class="progress-size">
              {{ formatUploadSize(task.loaded) }} / {{ formatUploadSize(task.total) }}
            </span>
            <span v-if="task.isResume" class="resume-badge">续传</span>
          </div>

          <!-- 任务操作按钮 -->
          <div class="task-actions">
            <!-- 下载中：显示暂停和取消按钮 -->
            <template v-if="task.status === 'downloading'">
              <button 
                class="task-pause-btn" 
                @click="pauseDownloadTask(task)"
              >暂停</button>
              <button 
                class="task-cancel-btn" 
                @click="cancelDownloadTask(task)"
              >取消</button>
            </template>
            <!-- 已暂停：显示继续和取消按钮 -->
            <template v-if="task.status === 'paused'">
              <button 
                class="task-resume-btn" 
                @click="resumeDownloadTask(task)"
              >继续</button>
              <button 
                class="task-cancel-btn" 
                @click="cancelDownloadTask(task)"
              >取消</button>
            </template>
            <!-- 错误：显示关闭按钮 -->
            <button 
              v-if="task.status === 'error'" 
              class="task-retry-btn"
              @click="removeDownloadTask(task.taskId)"
            >关闭</button>
          </div>

          <!-- 错误信息 -->
          <div v-if="task.error" class="task-error">{{ task.error }}</div>
        </div>
      </div>
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
  Folder, Document, Right, Warning, Download
} from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'
import { useSftpUpload } from '@/composables/useSftpUpload'

const themeStore = useThemeStore()
const { isDark } = storeToRefs(themeStore)

// 使用 SFTP 上传 composable（支持多文件并行上传）
const {
  uploadTasks,
  isUploading,
  uploadingCount,
  allTasksFinished,
  allTasksCompleted,
  allTasksCancelled,
  addUploadTasks,
  cancelUpload,
  confirmOverwrite,
  cancelConflict,
  cancelAllUploads,
  clearAllFinishedTasks,
  removeTask,
  formatFileSize: formatUploadSize,
  getStatusText
} = useSftpUpload()

const props = defineProps({
  sftp: {
    type: Object,
    required: true
  }
});

const fileInput = ref(null);

// 拖拽上传状态
const isDragOver = ref(false);

// 下载任务列表
const downloadTasks = ref([]);

// 下载任务的本地路径映射（用于恢复下载）
const downloadLocalPaths = new Map();

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

// 监听上传任务状态，全部完成或全部取消时自动刷新
watch(allTasksFinished, (finished) => {
  if (finished && uploadTasks.value.length > 0) {
    // 延迟一下刷新，让用户看到最终状态
    setTimeout(async () => {
      await refreshDirectory();
      if (allTasksCompleted.value) {
        ElMessage.success('所有文件上传完成');
      } else if (allTasksCancelled.value) {
        ElMessage.info('已取消所有上传任务');
      }
      // 清空任务列表
      clearAllFinishedTasks();
    }, 500);
  }
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
  // 创建下载任务
  const taskId = `download-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const task = {
    taskId,
    fileName: file.name,
    filePath: file.path,
    fileSize: file.size,
    status: 'downloading',
    progress: 0,
    loaded: 0,
    total: file.size || 0,
    error: null,
    localPath: null,
    isResume: false
  };
  
  downloadTasks.value.push(task);
  
  try {
    // 使用带保存对话框的下载方法（Electron 环境）
    // 非 Electron 环境会自动回退到浏览器下载
    const result = await props.sftp.downloadFileWithDialog(
      file.path, 
      file.name, 
      (progress) => {
        const t = downloadTasks.value.find(item => item.taskId === taskId);
        if (t) {
          t.loaded = progress.loaded;
          t.total = progress.total;
          t.progress = progress.percent;
          t.isResume = progress.isResume || false;
        }
      },
      // onCancel
      () => {
        const t = downloadTasks.value.find(item => item.taskId === taskId);
        if (t) {
          t.status = 'cancelled';
          t.error = '下载已取消';
        }
      },
      // onPause
      (localPath) => {
        const t = downloadTasks.value.find(item => item.taskId === taskId);
        if (t) {
          t.status = 'paused';
          t.localPath = localPath;
          downloadLocalPaths.set(file.path, localPath);
        }
      }
    );
    
    // 用户取消下载
    if (result === false) {
      const idx = downloadTasks.value.findIndex(item => item.taskId === taskId);
      if (idx !== -1) {
        downloadTasks.value.splice(idx, 1);
      }
      return;
    }
    
    // 下载被暂停
    if (result && result.paused) {
      const t = downloadTasks.value.find(item => item.taskId === taskId);
      if (t) {
        t.status = 'paused';
        if (result.localPath) {
          t.localPath = result.localPath;
          downloadLocalPaths.set(file.path, result.localPath);
        }
      }
      return;
    }
    
    // 下载完成
    const t = downloadTasks.value.find(item => item.taskId === taskId);
    if (t) {
      t.status = 'completed';
      t.progress = 100;
      t.localPath = result?.localPath;
    }
    
    // 清理映射
    downloadLocalPaths.delete(file.path);
    
    // 3秒后自动移除已完成的任务
    setTimeout(() => {
      const idx = downloadTasks.value.findIndex(item => item.taskId === taskId);
      if (idx !== -1 && downloadTasks.value[idx].status === 'completed') {
        downloadTasks.value.splice(idx, 1);
      }
    }, 3000);
    
  } catch (err) {
    const t = downloadTasks.value.find(item => item.taskId === taskId);
    if (t) {
      t.status = 'error';
      t.error = err.message;
    }
    ElMessage.error('下载失败: ' + err.message);
  }
};

// 移除下载任务
const removeDownloadTask = (taskId) => {
  const idx = downloadTasks.value.findIndex(item => item.taskId === taskId);
  if (idx !== -1) {
    downloadTasks.value.splice(idx, 1);
  }
};

// 取消下载任务
const cancelDownloadTask = async (task) => {
  try {
    // 先更新UI状态
    task.status = 'cancelled';
    task.error = '正在取消...';
    
    await props.sftp.cancelDownload(task.filePath);
    
    task.error = '下载已取消';
    downloadLocalPaths.delete(task.filePath);
    ElMessage.info('已取消下载');
  } catch (err) {
    console.error('取消下载失败:', err);
    task.status = 'error';
    task.error = '取消下载失败: ' + err.message;
    ElMessage.error('取消下载失败: ' + err.message);
  }
};

// 暂停下载任务
const pauseDownloadTask = async (task) => {
  try {
    task.status = 'paused';
    task.error = '正在暂停...';
    
    const result = await props.sftp.pauseDownload(task.filePath);
    
    if (result.success) {
      task.error = null;
      // 保存 localPath 用于恢复下载（优先使用后端返回的，其次使用已有的）
      if (result.localPath) {
        task.localPath = result.localPath;
        downloadLocalPaths.set(task.filePath, result.localPath);
      } else if (!task.localPath) {
        task.localPath = downloadLocalPaths.get(task.filePath);
      }
      ElMessage.info('下载已暂停');
    } else {
      task.status = 'downloading';
      task.error = result.message || '暂停失败';
    }
  } catch (err) {
    console.error('暂停下载失败:', err);
    task.status = 'downloading';
    task.error = '暂停下载失败: ' + err.message;
    ElMessage.error('暂停下载失败: ' + err.message);
  }
};

// 恢复下载任务（断点续传）
const resumeDownloadTask = async (task) => {
  try {
    task.status = 'downloading';
    task.error = null;
    
    // 获取 localPath（优先从 task 获取，其次从 Map 获取）
    let localPath = task.localPath;
    if (!localPath) {
      localPath = downloadLocalPaths.get(task.filePath);
    }
    
    if (!localPath) {
      throw new Error('无法获取本地路径，请重新下载');
    }
    
    const result = await props.sftp.resumeDownload(
      task.filePath, 
      localPath,
      (progress) => {
        task.loaded = progress.loaded;
        task.total = progress.total;
        task.progress = progress.percent;
        task.isResume = progress.isResume || true;
      }
    );
    
    // 下载被暂停
    if (result && result.paused) {
      task.status = 'paused';
      return;
    }
    
    // 下载完成
    if (result && result.success) {
      task.status = 'completed';
      task.progress = 100;
      downloadLocalPaths.delete(task.filePath);
      
      // 3秒后自动移除已完成的任务
      setTimeout(() => {
        const idx = downloadTasks.value.findIndex(item => item.taskId === task.taskId);
        if (idx !== -1 && downloadTasks.value[idx].status === 'completed') {
          downloadTasks.value.splice(idx, 1);
        }
      }, 3000);
    }
  } catch (err) {
    console.error('恢复下载失败:', err);
    task.status = 'error';
    task.error = '恢复下载失败: ' + err.message;
    ElMessage.error('恢复下载失败: ' + err.message);
  }
};

// 清空所有已完成/已取消的下载任务
const clearCompletedDownloadTasks = () => {
  downloadTasks.value = downloadTasks.value.filter(item => 
    item.status === 'downloading' || item.status === 'paused'
  );
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
    // 先复制选中的文件列表（避免迭代过程中 Set 被修改）
    const selectedPaths = Array.from(selectedFiles.value);
    const count = selectedPaths.length;

    if (count === 0) {
      ElMessage.warning('请先选择要删除的文件');
      return;
    }

    await ElMessageBox.confirm(
      `确定要删除选中的 ${count} 个项目吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    // 清除选择状态
    props.sftp.clearSelection();

    // 逐个删除文件（使用 deleteItemOnly 不刷新目录）
    let successCount = 0;
    let failCount = 0;

    for (const filePath of selectedPaths) {
      // 从当前文件列表中查找文件信息
      const file = files.value.find(f => f.path === filePath);
      if (file) {
        try {
          await props.sftp.deleteItemOnly(file.path, file.type);
          successCount++;
        } catch (err) {
          console.error(`删除 ${file.name} 失败:`, err);
          failCount++;
        }
      }
    }

    // 批量删除完成后，只刷新一次目录
    await refreshDirectory();

    // 显示结果
    if (failCount === 0) {
      ElMessage.success(`成功删除 ${successCount} 个项目`);
    } else {
      ElMessage.warning(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    }
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
 * 处理文件选择 - 支持多文件并行上传
 * Electron 环境：直接获取本地文件路径，后端流式读取并上传
 */
const handleFileUpload = (event) => {
  const filesList = Array.from(event.target.files);
  if (filesList.length === 0) return;

  // 构建上传任务列表
  const uploadFiles = filesList.map(file => {
    // Electron 环境：file.path 是本地文件的绝对路径
    const localPath = file.path || file.name;
    
    // 构建远程目标路径
    const remotePath = currentPath.value === '/'
      ? `/${file.name}`
      : `${currentPath.value}/${file.name}`;

    return { localPath, remotePath };
  });

  // 批量添加上传任务（并行上传）
  addUploadTasks(props.sftp.sessionId.value, uploadFiles);
  
  // 清空 input，允许重复选择同一文件
  event.target.value = '';
};

/**
 * 拖拽上传相关方法
 */
const handleDragOver = (event) => {
  // 检查是否拖拽的是文件
  if (event.dataTransfer.types.includes('Files')) {
    isDragOver.value = true;
  }
};

const handleDragLeave = (event) => {
  // 确保是离开了整个容器
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragOver.value = false;
  }
};

const handleDrop = (event) => {
  isDragOver.value = false;
  
  const filesList = Array.from(event.dataTransfer.files);
  if (filesList.length === 0) return;

  // 构建上传任务列表
  const uploadFiles = filesList.map(file => {
    // Electron 环境：file.path 是本地文件的绝对路径
    const localPath = file.path || file.name;
    
    // 构建远程目标路径
    const remotePath = currentPath.value === '/'
      ? `/${file.name}`
      : `${currentPath.value}/${file.name}`;

    return { localPath, remotePath };
  });

  // 批量添加上传任务（并行上传）
  addUploadTasks(props.sftp.sessionId.value, uploadFiles);
  
  ElMessage.success(`已添加 ${filesList.length} 个文件到上传队列`);
};

/**
 * 上传完成后刷新目录
 */
const handleUploadDone = () => {
  clearAllFinishedTasks();
  refreshDirectory();
  ElMessage.success('文件上传完成');
};

/**
 * 确认覆盖已存在的文件
 */
const handleConfirmOverwrite = (task) => {
  if (task.localPath && task.conflictInfo?.remotePath) {
    confirmOverwrite(
      props.sftp.sessionId.value,
      task.localPath,
      task.conflictInfo.remotePath
    );
  }
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

/* 多文件上传进度区域样式 */
.upload-progress-area {
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  max-height: 300px;
  overflow-y: auto;
}

.dark-theme .upload-progress-area {
  background: rgba(30, 30, 30, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.upload-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
}

.dark-theme .upload-summary {
  background: rgba(40, 40, 40, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-text {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.dark-theme .summary-text {
  color: #e0e0e0;
}

.summary-actions {
  display: flex;
  gap: 8px;
}

.cancel-all-btn,
.clear-all-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.cancel-all-btn {
  background: #f44336;
  color: #fff;
}

.cancel-all-btn:hover {
  background: #d32f2f;
}

.clear-all-btn {
  background: #4caf50;
  color: #fff;
}

.clear-all-btn:hover {
  background: #388e3c;
}

/* 上传任务列表 */
.upload-tasks-list {
  padding: 8px;
}

.upload-task-item {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.dark-theme .upload-task-item {
  background: rgba(50, 50, 50, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.upload-task-item:last-child {
  margin-bottom: 0;
}

.upload-task-item.completed {
  border-color: #4caf50;
}

.upload-task-item.error {
  border-color: #f44336;
}

.upload-task-item.cancelled {
  opacity: 0.6;
}

.upload-task-item.conflict {
  border-color: #ff9800;
  background: #fff8e1;
}

.dark-theme .upload-task-item.conflict {
  background: rgba(255, 152, 0, 0.1);
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.task-filename {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 60%;
}

.dark-theme .task-filename {
  color: #e0e0e0;
}

.task-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e0e0e0;
  color: #666;
}

.upload-task-item.uploading .task-status {
  background: #e3f2fd;
  color: #1976d2;
}

.upload-task-item.completed .task-status {
  background: #e8f5e9;
  color: #388e3c;
}

.upload-task-item.error .task-status {
  background: #ffebee;
  color: #d32f2f;
}

.upload-task-item.error .task-status {
  background: #ffebee;
  color: #d32f2f;
}

.upload-task-item.cancelled .task-status {
  background: #f5f5f5;
  color: #757575;
}

.upload-task-item.conflict .task-status {
  background: #fff3e0;
  color: #e65100;
}

.dark-theme .upload-task-item.cancelled .task-status {
  background: #fff3e0;
  color: #f57c00;
}

.dark-theme .task-status {
  background: rgba(80, 80, 80, 0.8);
  color: #aaa;
}

.dark-theme .upload-task-item.uploading .task-status {
  background: rgba(25, 118, 210, 0.3);
  color: #64b5f6;
}

.dark-theme .upload-task-item.completed .task-status {
  background: rgba(56, 142, 60, 0.3);
  color: #81c784;
}

.dark-theme .upload-task-item.error .task-status {
  background: rgba(211, 47, 47, 0.3);
  color: #ef9a9a;
}

/* 任务进度条 */
.task-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-track-mini {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.dark-theme .progress-track-mini {
  background: #3c3c3c;
}

.progress-fill-mini {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill-mini.error {
  background: #f44336;
}

.progress-fill-mini.cancelled {
  background: #ff9800;
}

.progress-percent {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  min-width: 36px;
  text-align: right;
}

.dark-theme .progress-percent {
  color: #aaa;
}

.progress-size {
  font-size: 10px;
  color: #999;
  min-width: 100px;
}

.dark-theme .progress-size {
  color: #666;
}

/* 任务操作按钮 */
.task-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}

.task-cancel-btn,
.task-retry-btn {
  padding: 3px 10px;
  font-size: 11px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
}

.task-cancel-btn {
  background: #f44336;
  color: #fff;
}

.task-cancel-btn:hover {
  background: #d32f2f;
}

.task-overwrite-btn {
  padding: 3px 10px;
  font-size: 11px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
  background: #ff9800;
  color: #fff;
  margin-right: 6px;
}

.task-overwrite-btn:hover {
  background: #f57c00;
}

.task-retry-btn {
  background: #9e9e9e;
  color: #fff;
}

.task-retry-btn:hover {
  background: #757575;
}

/* 任务错误信息 */
.task-error {
  margin-top: 6px;
  padding: 6px 8px;
  background: #ffebee;
  border-radius: 4px;
  font-size: 11px;
  color: #c62828;
}

.dark-theme .task-error {
  background: rgba(100, 30, 30, 0.5);
  color: #ef9a9a;
}

/* 任务冲突信息 */
.task-conflict-info {
  margin-top: 6px;
  padding: 6px 8px;
  background: #fff8e1;
  border-radius: 4px;
  font-size: 11px;
  color: #e65100;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dark-theme .task-conflict-info {
  background: rgba(255, 152, 0, 0.15);
  color: #ffb74d;
}

/* 拖拽上传遮罩层 */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(64, 158, 255, 0.15);
  border: 3px dashed #409eff;
  border-radius: 8px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.dark-theme .drag-overlay {
  background: rgba(0, 122, 255, 0.2);
  border-color: #007AFF;
}

.drag-content {
  text-align: center;
  padding: 40px;
}

.drag-icon {
  font-size: 64px;
  color: #409eff;
  margin-bottom: 16px;
}

.dark-theme .drag-icon {
  color: #007AFF;
}

.drag-text {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  margin: 0 0 8px 0;
}

.dark-theme .drag-text {
  color: #007AFF;
}

.drag-hint {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.dark-theme .drag-hint {
  color: #98989d;
}

.sftp-file-manager.drag-over {
  position: relative;
}

/* 下载进度区域样式 */
.download-progress-area {
  background: #e8f5e9;
  border-bottom: 1px solid #a5d6a7;
  max-height: 250px;
  overflow-y: auto;
}

.dark-theme .download-progress-area {
  background: rgba(46, 125, 50, 0.15);
  border-bottom: 1px solid rgba(76, 175, 80, 0.3);
}

.download-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #a5d6a7;
  background: #fff;
}

.dark-theme .download-summary {
  background: rgba(40, 60, 40, 0.9);
  border-bottom: 1px solid rgba(76, 175, 80, 0.2);
}

.download-summary .summary-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #2e7d32;
}

.dark-theme .download-summary .summary-text {
  color: #81c784;
}

.download-summary .summary-icon {
  font-size: 16px;
}

/* 下载任务列表 */
.download-tasks-list {
  padding: 8px;
}

.download-task-item {
  background: #fff;
  border: 1px solid #c8e6c9;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 8px;
  transition: all 0.2s;
}

.dark-theme .download-task-item {
  background: rgba(50, 70, 50, 0.8);
  border-color: rgba(76, 175, 80, 0.2);
}

.download-task-item:last-child {
  margin-bottom: 0;
}

.download-task-item.completed {
  border-color: #4caf50;
}

.download-task-item.error {
  border-color: #f44336;
}

.download-task-item.cancelled {
  border-color: #ff9800;
  opacity: 0.7;
}

/* 下载进度条颜色 */
.progress-track-mini.download-track {
  background: #e8f5e9;
}

.dark-theme .progress-track-mini.download-track {
  background: #2a3a2a;
}

.progress-fill-mini.download-fill {
  background: linear-gradient(90deg, #4caf50, #8bc34a);
}

.progress-fill-mini.download-fill.error {
  background: #f44336;
}

.progress-fill-mini.download-fill.cancelled {
  background: #ff9800;
}

.download-task-item.cancelled .task-status {
  background: #fff3e0;
  color: #e65100;
}

.dark-theme .download-task-item.cancelled .task-status {
  background: rgba(255, 152, 0, 0.3);
  color: #ffb74d;
}

/* 暂停状态样式 */
.download-task-item.paused {
  border-color: #ff9800;
  background: #fff8e1;
}

.dark-theme .download-task-item.paused {
  background: rgba(255, 152, 0, 0.1);
  border-color: rgba(255, 152, 0, 0.3);
}

.download-task-item.paused .task-status {
  background: #fff3e0;
  color: #e65100;
}

.dark-theme .download-task-item.paused .task-status {
  background: rgba(255, 152, 0, 0.3);
  color: #ffb74d;
}

.progress-fill-mini.download-fill.paused {
  background: #ff9800;
}

/* 暂停和继续按钮样式 */
.task-pause-btn,
.task-resume-btn {
  padding: 3px 10px;
  font-size: 11px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
  margin-right: 6px;
}

.task-pause-btn {
  background: #ff9800;
  color: #fff;
}

.task-pause-btn:hover {
  background: #f57c00;
}

.task-resume-btn {
  background: #4caf50;
  color: #fff;
}

.task-resume-btn:hover {
  background: #388e3c;
}

/* 续传标记 */
.resume-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: #e3f2fd;
  color: #1976d2;
  margin-left: 6px;
}

.dark-theme .resume-badge {
  background: rgba(25, 118, 210, 0.3);
  color: #64b5f6;
}
</style>
