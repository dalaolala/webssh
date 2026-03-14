import { ref, onUnmounted } from 'vue';
import axios from 'axios';
import { encryptPayload } from '../utils/crypto';
import { io } from 'socket.io-client';

// 心跳间隔（毫秒）- 每2分钟发送一次心跳
const HEARTBEAT_INTERVAL = 2 * 60 * 1000;

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

    // 心跳定时器
    let heartbeatTimer = null;
    
    // Socket 连接（用于下载进度）
    let downloadSocket = null;

    // 发送心跳
    const sendHeartbeat = async () => {
        if (!sessionId.value) return;
        try {
            await axios.post('/api/sftp/quick/heartbeat', {
                sessionId: sessionId.value
            });
        } catch (err) {
            console.warn('SFTP 心跳发送失败:', err.message);
        }
    };

    // 启动心跳
    const startHeartbeat = () => {
        stopHeartbeat();
        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    };

    // 停止心跳
    const stopHeartbeat = () => {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    };
    
    // 初始化下载用的 Socket
    const initDownloadSocket = () => {
        if (downloadSocket && downloadSocket.connected) {
            return downloadSocket;
        }
        downloadSocket = io({
            transports: ['websocket', 'polling']
        });
        return downloadSocket;
    };
    
    // 确保 Socket 连接就绪
    const ensureSocketConnected = () => {
        return new Promise((resolve) => {
            const socket = initDownloadSocket();
            if (socket.connected) {
                resolve(socket);
                return;
            }
            socket.on('connect', () => {
                resolve(socket);
            });
            // 如果连接失败，也 resolve（让请求继续，只是没有进度）
            setTimeout(() => resolve(socket), 1000);
        });
    };

    // 连接 SFTP
    const connectSftp = async (connectionInfo) => {
        try {
            loading.value = true;
            error.value = null;

            // 使用 RSA + AES 混合加密传输载荷
            const rawPayload = {
                host: connectionInfo.host,
                port: connectionInfo.port,
                username: connectionInfo.username,
                password: connectionInfo.password,
                privateKey: connectionInfo.privateKey
            };
            const secureData = await encryptPayload(rawPayload);

            const response = await axios.post('/api/sftp/quick/connect', secureData);

            if (response.data.success) {
                isConnected.value = true;
                sessionId.value = response.data.sessionId;
                currentPath.value = response.data.currentPath;
                files.value = response.data.files;
                // 连接成功后启动心跳
                startHeartbeat();
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
        // 先停止心跳
        stopHeartbeat();
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

    // 删除文件或目录（不刷新目录）
    const deleteItemOnly = async (itemPath, itemType) => {
        try {
            const response = await axios.delete('/api/sftp/quick/delete', {
                data: {
                    sessionId: sessionId.value,
                    path: itemPath,
                    type: itemType
                }
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

    // 删除文件或目录（删除后刷新目录）
    const deleteItem = async (itemPath, itemType) => {
        await deleteItemOnly(itemPath, itemType);
        await listDirectory(currentPath.value);
        return true;
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

    // 下载文件（带进度回调）
    // onProgress: (progress) => void, progress = { loaded, total, percent }
    const downloadFileWithProgress = async (filePath, fileName, onProgress = null) => {
        try {
            const url = `/api/sftp/quick/download?sessionId=${sessionId.value}&path=${encodeURIComponent(filePath)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: '下载失败' }));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            // 获取文件大小
            const contentLength = response.headers.get('Content-Length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            // 读取流
            const reader = response.body.getReader();
            const chunks = [];
            let loaded = 0;

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                loaded += value.length;

                // 回调进度
                if (onProgress && total > 0) {
                    onProgress({
                        loaded,
                        total,
                        percent: Math.round((loaded / total) * 100)
                    });
                }
            }

            // 完成时回调 100%
            if (onProgress) {
                onProgress({
                    loaded: total > 0 ? total : loaded,
                    total: total > 0 ? total : loaded,
                    percent: 100
                });
            }

            // 合并所有 chunks 并创建 Blob
            const blob = new Blob(chunks);
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);

            return true;
        } catch (err) {
            error.value = err.message;
            throw err;
        }
    };

    // 下载文件（无进度，兼容旧接口）
    const downloadFile = async (filePath, fileName) => {
        return downloadFileWithProgress(filePath, fileName, null);
    };

    // 存储活跃的下载任务控制器（用于前端取消/暂停）
    const downloadControllers = new Map();

    // 下载文件到选择的本地路径（Electron 环境，弹出保存对话框）
    // 支持断点续传、暂停/恢复
    // onProgress: (progress) => void, progress = { loaded, total, percent }
    // onCancel: () => void, 当下载被取消时的回调
    // onPause: (localPath) => void, 当下载被暂停时的回调，传递 localPath
    const downloadFileWithDialog = async (filePath, fileName, onProgress = null, onCancel = null, onPause = null) => {
        // 创建下载控制器
        const controller = {
            paused: false,
            cancelled: false,
            localPath: null,
            started: false
        };
        downloadControllers.set(filePath, controller);

        try {
            // 检查是否在 Electron 环境
            if (!window.electron || !window.electron.showSaveDialog) {
                // 非 Electron 环境，回退到浏览器下载
                downloadControllers.delete(filePath);
                return downloadFileWithProgress(filePath, fileName, onProgress);
            }

            // 检查是否已取消
            if (controller.cancelled) {
                downloadControllers.delete(filePath);
                return false;
            }

            // 弹出保存对话框
            const result = await window.electron.showSaveDialog({
                title: '保存文件',
                defaultPath: fileName,
                filters: [
                    { name: '所有文件', extensions: ['*'] }
                ]
            });

            // 用户取消或已被取消
            if (controller.cancelled) {
                downloadControllers.delete(filePath);
                return false;
            }

            // 用户取消对话框
            if (result.canceled || !result.filePath) {
                downloadControllers.delete(filePath);
                return false;
            }

            const localPath = result.filePath;
            controller.localPath = localPath;
            controller.started = true;

            // 确保 Socket 连接就绪
            const socket = await ensureSocketConnected();
            
            // 进度监听状态
            let progressHandler = null;
            let isComplete = false;
            
            // 设置进度监听
            progressHandler = (data) => {
                // 匹配当前下载任务
                if (data.remotePath === filePath && data.localPath === localPath) {
                    if (onProgress && !isComplete) {
                        onProgress({
                            loaded: data.loaded,
                            total: data.total,
                            percent: data.percent,
                            isResume: data.isResume,
                            existingSize: data.existingSize
                        });
                    }
                    if (data.percent >= 100) {
                        isComplete = true;
                    }
                }
            };
            socket.on('sftp-download-progress', progressHandler);

            try {
                // 调用后端接口，直接下载到本地路径
                // 注意：大文件下载可能需要很长时间，不设置超时或设置很长的超时
                const response = await axios.post('/api/sftp/quick/download-to-local', {
                    sessionId: sessionId.value,
                    remotePath: filePath,
                    localPath: localPath
                }, {
                    timeout: 0  // 不设置超时，依赖 Socket.io 进度推送
                });

                // 检查是否在下载过程中被暂停
                if (controller.paused) {
                    if (onPause) onPause(localPath);
                    return { paused: true, localPath };
                }

                // 检查是否在下载过程中被取消
                if (controller.cancelled) {
                    return false;
                }

                if (!response.data.success && response.data.paused) {
                    // 下载被暂停
                    if (onPause) onPause(localPath);
                    return { paused: true, localPath };
                }

                if (!response.data.success) {
                    throw new Error(response.data.message || '下载失败');
                }

                // 确保最终进度为 100%
                if (onProgress && !isComplete) {
                    onProgress({
                        loaded: response.data.size || 0,
                        total: response.data.size || 0,
                        percent: 100
                    });
                }

                return { success: true, localPath: response.data.localPath };

            } finally {
                // 清理监听器
                socket.off('sftp-download-progress', progressHandler);
                // 只有在非暂停状态下才删除控制器
                if (!controller.paused) {
                    downloadControllers.delete(filePath);
                }
            }

        } catch (err) {
            downloadControllers.delete(filePath);
            // 如果是暂停导致的错误，不抛出
            if (controller.paused) {
                if (onPause) onPause(controller.localPath);
                return { paused: true, localPath: controller.localPath };
            }
            // 如果是取消导致的错误，不抛出
            if (controller.cancelled) {
                if (onCancel) onCancel();
                return false;
            }
            error.value = err.response?.data?.message || err.message;
            throw err;
        }
    };

    // 暂停下载
    const pauseDownload = async (remotePath) => {
        if (!sessionId.value) {
            throw new Error('会话不存在');
        }
        
        const controller = downloadControllers.get(remotePath);
        
        // 标记为已暂停
        if (controller) {
            controller.paused = true;
        }
        
        // 如果下载已开始，调用后端暂停
        if (controller && controller.started) {
            try {
                const response = await axios.post('/api/sftp/quick/download-pause', {
                    sessionId: sessionId.value,
                    remotePath: remotePath
                });
                return response.data;
            } catch (err) {
                console.error('暂停下载失败:', err);
                return { success: true, message: '下载已暂停' };
            }
        }
        
        // 下载未开始，直接返回成功
        return { success: true, message: '下载已暂停' };
    };

    // 恢复下载（断点续传）
    const resumeDownload = async (remotePath, localPath, onProgress = null) => {
        if (!sessionId.value) {
            throw new Error('会话不存在');
        }

        // 创建新的 controller（旧的在暂停时已被删除）
        const controller = {
            paused: false,
            cancelled: false,
            localPath: localPath,
            started: true
        };
        downloadControllers.set(remotePath, controller);

        // 确保 Socket 连接就绪
        const socket = await ensureSocketConnected();
        
        // 进度监听状态
        let progressHandler = null;
        let isComplete = false;
        
        // 设置进度监听
        progressHandler = (data) => {
            if (data.remotePath === remotePath && data.localPath === localPath) {
                if (onProgress && !isComplete) {
                    onProgress({
                        loaded: data.loaded,
                        total: data.total,
                        percent: data.percent,
                        isResume: data.isResume,
                        existingSize: data.existingSize
                    });
                }
                if (data.percent >= 100) {
                    isComplete = true;
                }
            }
        };
        socket.on('sftp-download-progress', progressHandler);

        try {
            // 重新调用下载接口，会自动检测临时文件并续传
            // 注意：大文件下载可能需要很长时间，不设置超时
            const response = await axios.post('/api/sftp/quick/download-to-local', {
                sessionId: sessionId.value,
                remotePath: remotePath,
                localPath: localPath
            }, {
                timeout: 0  // 不设置超时，依赖 Socket.io 进度推送
            });

            // 检查是否在下载过程中被暂停
            if (controller.paused) {
                return { paused: true, localPath };
            }

            // 检查是否在下载过程中被取消
            if (controller.cancelled) {
                return { cancelled: true };
            }

            if (!response.data.success && response.data.paused) {
                return { paused: true, localPath };
            }

            if (!response.data.success) {
                throw new Error(response.data.message || '恢复下载失败');
            }

            // 确保最终进度为 100%
            if (onProgress && !isComplete) {
                onProgress({
                    loaded: response.data.size || 0,
                    total: response.data.size || 0,
                    percent: 100
                });
            }

            return { success: true, localPath: response.data.localPath };

        } finally {
            socket.off('sftp-download-progress', progressHandler);
            // 只有在非暂停状态下才删除控制器
            if (!controller.paused) {
                downloadControllers.delete(remotePath);
            }
        }
    };

    // 获取下载状态（检查是否可恢复）
    const getDownloadStatus = async (remotePath, localPath) => {
        if (!sessionId.value) {
            throw new Error('会话不存在');
        }

        try {
            const response = await axios.get('/api/sftp/quick/download-status', {
                params: {
                    sessionId: sessionId.value,
                    remotePath: remotePath,
                    localPath: localPath
                }
            });
            return response.data;
        } catch (err) {
            console.error('获取下载状态失败:', err);
            return { success: false, message: err.message };
        }
    };

    // 取消下载
    const cancelDownload = async (remotePath) => {
        if (!sessionId.value) {
            throw new Error('会话不存在');
        }
        
        const controller = downloadControllers.get(remotePath);
        
        // 标记为已取消
        if (controller) {
            controller.cancelled = true;
        }
        
        // 如果下载已开始，调用后端取消
        if (controller && controller.started) {
            try {
                const response = await axios.post('/api/sftp/quick/download-cancel', {
                    sessionId: sessionId.value,
                    remotePath: remotePath
                });
                return response.data;
            } catch (err) {
                console.error('取消下载失败:', err);
                // 即使后端取消失败，前端也已标记为取消
                return { success: true, message: '下载已取消' };
            }
        }
        
        // 下载未开始，直接返回成功
        return { success: true, message: '下载已取消' };
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

    // 清理资源
    onUnmounted(() => {
        stopHeartbeat();
        if (downloadSocket) {
            downloadSocket.disconnect();
            downloadSocket = null;
        }
    });

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
        stopHeartbeat,
        listDirectory,
        enterDirectory,
        goToParentDirectory,
        readFile,
        saveFile,
        createDirectory,
        deleteItem,
        deleteItemOnly,
        renameItem,
        uploadFile,
        downloadFile,
        downloadFileWithProgress,
        downloadFileWithDialog,
        cancelDownload,
        pauseDownload,
        resumeDownload,
        getDownloadStatus,
        toggleFileSelection,
        clearSelection
    };
}
