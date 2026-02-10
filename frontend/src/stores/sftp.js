import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useSftpStore = defineStore('sftp', () => {
  const isConnected = ref(false);
  const currentServer = ref(null);
  const currentPath = ref('/');
  const files = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const selectedFiles = ref(new Set());

  // 连接SFTP
  const connectSftp = async (server) => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.post('/api/sftp/connect', {
        serverId: server.id
      });
      
      if (response.data.success) {
        isConnected.value = true;
        currentServer.value = server;
        currentPath.value = response.data.currentPath;
        files.value = response.data.files;
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 断开SFTP连接
  const disconnectSftp = async () => {
    try {
      if (currentServer.value) {
        await axios.post('/api/sftp/disconnect', {
          serverId: currentServer.value.id
        });
      }
    } catch (err) {
      console.error('断开SFTP连接错误:', err);
    } finally {
      isConnected.value = false;
      currentServer.value = null;
      currentPath.value = '/';
      files.value = [];
      selectedFiles.value.clear();
    }
  };

  // 列出目录内容
  const listDirectory = async (path = '.') => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.get('/api/sftp/list', {
        params: {
          serverId: currentServer.value.id,
          path: path
        }
      });
      
      if (response.data.success) {
        currentPath.value = response.data.currentPath;
        files.value = response.data.files;
        selectedFiles.value.clear();
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
    } finally {
      loading.value = false;
    }
  };

  // 进入目录
  const enterDirectory = async (directoryName) => {
    const newPath = currentPath.value === '/' ? 
      `/${directoryName}` : 
      `${currentPath.value}/${directoryName}`;
    await listDirectory(newPath);
  };

  // 返回上级目录
  const goToParentDirectory = async () => {
    if (currentPath.value === '/' || currentPath.value === '.') {
      return;
    }
    
    const parentPath = currentPath.value.split('/').slice(0, -1).join('/') || '/';
    await listDirectory(parentPath);
  };

  // 读取文件内容
  const readFile = async (filePath) => {
    try {
      const response = await axios.get('/api/sftp/file', {
        params: {
          serverId: currentServer.value.id,
          path: filePath
        }
      });
      
      if (response.data.success) {
        return response.data.content;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  // 保存文件内容
  const saveFile = async (filePath, content) => {
    try {
      const response = await axios.post('/api/sftp/file', {
        serverId: currentServer.value.id,
        path: filePath,
        content: content
      });
      
      if (response.data.success) {
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  // 创建目录
  const createDirectory = async (dirName) => {
    try {
      const newPath = currentPath.value === '/' ? 
        `/${dirName}` : 
        `${currentPath.value}/${dirName}`;
      
      const response = await axios.post('/api/sftp/mkdir', {
        serverId: currentServer.value.id,
        path: newPath
      });
      
      if (response.data.success) {
        await listDirectory(currentPath.value);
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  // 删除文件或目录
  const deleteItem = async (itemPath, itemType) => {
    try {
      const response = await axios.delete('/api/sftp/delete', {
        data: {
          serverId: currentServer.value.id,
          path: itemPath,
          type: itemType
        }
      });
      
      if (response.data.success) {
        await listDirectory(currentPath.value);
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  // 重命名文件或目录
  const renameItem = async (oldPath, newName) => {
    try {
      const parentPath = oldPath.split('/').slice(0, -1).join('/') || '/';
      const newPath = parentPath === '/' ? 
        `/${newName}` : 
        `${parentPath}/${newName}`;
      
      const response = await axios.post('/api/sftp/rename', {
        serverId: currentServer.value.id,
        oldPath: oldPath,
        newPath: newPath
      });
      
      if (response.data.success) {
        await listDirectory(currentPath.value);
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  // 上传文件
  const uploadFile = async (file, targetPath = null) => {
    try {
      const uploadPath = targetPath || 
        (currentPath.value === '/' ? 
          `/${file.name}` : 
          `${currentPath.value}/${file.name}`);
      
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);
      formData.append('serverId', currentServer.value.id);
      formData.append('path', uploadPath);
      
      const response = await axios.post('/api/sftp/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        await listDirectory(currentPath.value);
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  // 下载文件
  const downloadFile = async (filePath, fileName) => {
    try {
      const response = await axios.get(`/api/sftp/download?serverId=${currentServer.value.id}&path=${encodeURIComponent(filePath)}`, {
        responseType: 'blob'
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    }
  };

  // 切换文件选择状态
  const toggleFileSelection = (filePath) => {
    if (selectedFiles.value.has(filePath)) {
      selectedFiles.value.delete(filePath);
    } else {
      selectedFiles.value.add(filePath);
    }
  };

  // 清除所有选择
  const clearSelection = () => {
    selectedFiles.value.clear();
  };

  return {
    // 状态
    isConnected,
    currentServer,
    currentPath,
    files,
    loading,
    error,
    selectedFiles,
    
    // 操作
    connectSftp,
    disconnectSftp,
    listDirectory,
    enterDirectory,
    goToParentDirectory,
    readFile,
    saveFile,
    createDirectory,
    deleteItem,
    renameItem,
    uploadFile,
    downloadFile,
    toggleFileSelection,
    clearSelection
  };
});