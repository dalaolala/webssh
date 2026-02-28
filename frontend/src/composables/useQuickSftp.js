import { ref } from 'vue';
import axios from 'axios';

// 这是一个组合式函数(Composable)而不是全局 Pinia Store
// 这样每次调用 useQuickSftp() 都会生成完全独立的响应式状态，非常适合多标签页互不干扰。
export function useQuickSftp() {
    const isConnected = ref(false);
    const sessionId = ref(null);
    const currentPath = ref('/');
    const files = ref([]);
    const loading = ref(false);
    const error = ref(null);
    const selectedFiles = ref(new Set());

    // 连接 SFTP
    const connectSftp = async (connectionInfo) => {
        try {
            loading.value = true;
            error.value = null;

            const response = await axios.post('/api/sftp/quick/connect', {
                host: connectionInfo.host,
                port: connectionInfo.port,
                username: connectionInfo.username,
                password: connectionInfo.password,
                privateKey: connectionInfo.privateKey
            });

            if (response.data.success) {
                isConnected.value = true;
                sessionId.value = response.data.sessionId;
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

    // 断开 SFTP 连接
    const disconnectSftp = async () => {
        try {
            if (sessionId.value) {
                await axios.post('/api/sftp/quick/disconnect', {
                    sessionId: sessionId.value
                });
            }
        } catch (err) {
            console.error('断开快速SFTP连接错误:', err);
        } finally {
            isConnected.value = false;
            sessionId.value = null;
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

            const response = await axios.get('/api/sftp/quick/list', {
                params: {
                    sessionId: sessionId.value,
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
            const response = await axios.get('/api/sftp/quick/file', {
                params: {
                    sessionId: sessionId.value,
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
            const response = await axios.post('/api/sftp/quick/file', {
                sessionId: sessionId.value,
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

            const response = await axios.post('/api/sftp/quick/mkdir', {
                sessionId: sessionId.value,
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
            const response = await axios.delete('/api/sftp/quick/delete', {
                data: {
                    sessionId: sessionId.value,
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

            const response = await axios.post('/api/sftp/quick/rename', {
                sessionId: sessionId.value,
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

            const formData = new FormData();
            formData.append('file', file);
            formData.append('sessionId', sessionId.value);
            formData.append('path', uploadPath);

            const response = await axios.post('/api/sftp/quick/upload', formData, {
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
            const response = await axios.get(`/api/sftp/quick/download?sessionId=${sessionId.value}&path=${encodeURIComponent(filePath)}`, {
                responseType: 'blob'
            });

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

    const toggleFileSelection = (filePath) => {
        if (selectedFiles.value.has(filePath)) {
            selectedFiles.value.delete(filePath);
        } else {
            selectedFiles.value.add(filePath);
        }
    };

    const clearSelection = () => {
        selectedFiles.value.clear();
    };

    return {
        isConnected,
        sessionId,
        currentPath,
        files,
        loading,
        error,
        selectedFiles,

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
}
