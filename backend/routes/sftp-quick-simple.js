const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();
const SftpHandler = require('../utils/sftpHandler');
const { decryptPayload } = require('../utils/crypto');

// 配置multer用于文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 * 1024 // 10GB限制
    }
});

// 存储活跃的SFTP连接
// Key: sessionId -> Value: { handler: SftpHandler, lastHeartbeat: timestamp }
const sftpConnections = new Map();

// 心跳超时时间（毫秒）- 超过此时间没有心跳则清理连接
const HEARTBEAT_TIMEOUT = 5 * 60 * 1000; // 5分钟
// 心跳检查间隔
const HEARTBEAT_CHECK_INTERVAL = 60 * 1000; // 1分钟检查一次

// 定期检查并清理超时的连接
const heartbeatChecker = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, entry] of sftpConnections.entries()) {
        if (now - entry.lastHeartbeat > HEARTBEAT_TIMEOUT) {
            console.log(`SFTP 会话 ${sessionId} 心跳超时，自动清理`);
            try {
                if (entry.handler && entry.handler.isConnected) {
                    entry.handler.disconnect();
                }
            } catch (e) {
                console.error(`断开 SFTP 会话 ${sessionId} 时出错:`, e);
            }
            sftpConnections.delete(sessionId);
        }
    }
}, HEARTBEAT_CHECK_INTERVAL);

// 清理所有连接 - 在进程退出时调用
const cleanupAllConnections = () => {
    clearInterval(heartbeatChecker);
    for (const [sessionId, entry] of sftpConnections.entries()) {
        try {
            if (entry.handler && entry.handler.isConnected) {
                entry.handler.disconnect();
            }
        } catch (error) {
            console.error(`清理 SFTP 会话 ${sessionId} 时出错:`, error);
        }
    }
    sftpConnections.clear();
};

// 注册进程退出清理
process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，清理 SFTP 连接...');
    cleanupAllConnections();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，清理 SFTP 连接...');
    cleanupAllConnections();
    process.exit(0);
});

process.on('beforeExit', () => {
    console.log('进程即将退出，清理 SFTP 连接...');
    cleanupAllConnections();
});

// 连接SFTP - 快速连接专属（无认证版本）
router.post('/connect', async (req, res) => {
    try {
        let connectionInfo = req.body;

        // 如果请求体包含 key 和 data，说明是加密传输
        if (connectionInfo.key && connectionInfo.data) {
            try {
                connectionInfo = decryptPayload(connectionInfo.key, connectionInfo.data);
            } catch (err) {
                console.error('解密载荷失败:', err);
                return res.status(400).json({
                    success: false,
                    message: '无效的加密数据结构'
                });
            }
        }

        const { host, port, username, password, privateKey } = connectionInfo;

        if (!host || !username) {
            return res.status(400).json({
                success: false,
                message: '主机和用户名不能为空'
            });
        }

        const serverConfig = {
            host: host,
            port: port || 22,
            username: username,
            password: password,
            privateKey: privateKey
        };

        const sftpHandler = new SftpHandler(serverConfig);
        await sftpHandler.connect();

        // 生成隔离的 sessionId
        const sessionId = crypto.randomUUID();
        sftpConnections.set(sessionId, {
            handler: sftpHandler,
            lastHeartbeat: Date.now()
        });

        // 获取根目录列表
        const files = await sftpHandler.listDirectory('.');

        res.json({
            success: true,
            message: 'SFTP连接成功',
            sessionId: sessionId,
            currentPath: '/',
            files: files
        });
    } catch (error) {
        console.error('SFTP快速连接错误:', error);
        res.status(500).json({
            success: false,
            message: 'SFTP连接失败: ' + error.message
        });
    }
});

// 获取已存在的连接（同时更新心跳时间）
function getQuickSftpConnection(sessionId) {
    if (!sessionId) {
        throw new Error('未提供 sessionId');
    }

    if (!sftpConnections.has(sessionId)) {
        throw new Error('SFTP会话已过期或不存在，请重新连接');
    }

    const entry = sftpConnections.get(sessionId);
    const connection = entry.handler;
    if (!connection || !connection.isConnected) {
        sftpConnections.delete(sessionId);
        throw new Error('SFTP连接已断开，请重新连接');
    }

    // 更新心跳时间
    entry.lastHeartbeat = Date.now();

    return connection;
}

// 断开SFTP连接
router.post('/disconnect', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (sessionId && sftpConnections.has(sessionId)) {
            const entry = sftpConnections.get(sessionId);
            await entry.handler.disconnect();
            sftpConnections.delete(sessionId);
        }

        res.json({
            success: true,
            message: 'SFTP连接已断开'
        });
    } catch (error) {
        console.error('断开快速SFTP连接错误:', error);
        res.status(500).json({
            success: false,
            message: '断开连接失败: ' + error.message
        });
    }
});

// 心跳接口 - 前端定期调用以保持连接活跃
router.post('/heartbeat', (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId || !sftpConnections.has(sessionId)) {
        return res.json({
            success: false,
            message: '会话不存在'
        });
    }

    const entry = sftpConnections.get(sessionId);
    entry.lastHeartbeat = Date.now();

    res.json({
        success: true,
        message: '心跳更新成功'
    });
});

// 列出目录内容
router.get('/list', async (req, res) => {
    try {
        const { sessionId, path = '.' } = req.query;

        const sftpHandler = getQuickSftpConnection(sessionId);
        const files = await sftpHandler.listDirectory(path);

        res.json({
            success: true,
            currentPath: path,
            files: files
        });
    } catch (error) {
        console.error('列出快速目录错误:', error);
        res.status(500).json({
            success: false,
            message: '列出目录失败: ' + error.message
        });
    }
});

// 读取文件内容
router.get('/file', async (req, res) => {
    try {
        const { sessionId, path } = req.query;

        if (!path) {
            return res.status(400).json({
                success: false,
                message: '文件路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        const content = await sftpHandler.getFileContent(path);

        res.json({
            success: true,
            content: content,
            path: path
        });
    } catch (error) {
        console.error('读取快速文件错误:', error);
        res.status(500).json({
            success: false,
            message: '读取文件失败: ' + error.message
        });
    }
});

// 保存文件内容
router.post('/file', async (req, res) => {
    let tempPath = null;
    
    try {
        const { sessionId, path, content } = req.body;

        if (!path || content === undefined) {
            return res.status(400).json({
                success: false,
                message: '文件路径和内容不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);

        // 创建临时文件保存内容，然后上传
        const os = require('os');
        const pathModule = require('path');

        tempPath = pathModule.join(os.tmpdir(), `sftp_quick_edit_${Date.now()}.tmp`);
        fs.writeFileSync(tempPath, content, 'utf8');

        await sftpHandler.uploadFile(tempPath, path);

        res.json({
            success: true,
            message: '文件保存成功'
        });
    } catch (error) {
        console.error('保存快速文件错误:', error);
        res.status(500).json({
            success: false,
            message: '保存文件失败: ' + error.message
        });
    } finally {
        // 确保临时文件被清理
        if (tempPath && fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
        }
    }
});

// 创建目录
router.post('/mkdir', async (req, res) => {
    try {
        const { sessionId, path } = req.body;

        if (!path) {
            return res.status(400).json({
                success: false,
                message: '目录路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        await sftpHandler.createDirectory(path);

        res.json({
            success: true,
            message: '目录创建成功'
        });
    } catch (error) {
        console.error('创建快速目录错误:', error);
        res.status(500).json({
            success: false,
            message: '创建目录失败: ' + error.message
        });
    }
});

// 删除文件或目录
router.delete('/delete', async (req, res) => {
    try {
        const { sessionId, path, type } = req.body;

        if (!path) {
            return res.status(400).json({
                success: false,
                message: '路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);

        if (type === 'directory') {
            await sftpHandler.deleteDirectory(path);
        } else {
            await sftpHandler.deleteFile(path);
        }

        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (error) {
        console.error('快速删除错误:', error);
        res.status(500).json({
            success: false,
            message: '删除失败: ' + error.message
        });
    }
});

// 重命名文件或目录
router.post('/rename', async (req, res) => {
    try {
        const { sessionId, oldPath, newPath } = req.body;

        if (!oldPath || !newPath) {
            return res.status(400).json({
                success: false,
                message: '原路径和新路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        await sftpHandler.renameFile(oldPath, newPath);

        res.json({
            success: true,
            message: '重命名成功'
        });
    } catch (error) {
        console.error('快速重命名错误:', error);
        res.status(500).json({
            success: false,
            message: '重命名失败: ' + error.message
        });
    }
});

// 文件上传
router.post('/upload', upload.single('file'), async (req, res) => {
    const tempFilePath = req.file ? req.file.path : null;
    
    try {
        const { sessionId, path: remotePath } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '没有选择文件'
            });
        }

        if (!sessionId || !remotePath) {
            return res.status(400).json({
                success: false,
                message: '会话ID和路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        const fileName = req.file.originalname;
        const totalSize = req.file.size;

        // 获取 Socket.io 实例用于推送进度
        const io = global.ioInstance;
        
        // 进度回调函数
        const onProgress = (progress) => {
            if (io) {
                io.emit('sftp-upload-progress', {
                    sessionId,
                    fileName,
                    loaded: progress.loaded,
                    total: progress.total,
                    percent: progress.percent
                });
            }
        };

        await sftpHandler.uploadFile(req.file.path, remotePath, onProgress);

        // 上传完成通知
        if (io) {
            io.emit('sftp-upload-complete', {
                sessionId,
                fileName,
                success: true
            });
        }

        res.json({
            success: true,
            message: '文件上传成功',
            filename: fileName,
            size: totalSize
        });

    } catch (error) {
        console.error('快速文件上传错误:', error);

        // 上传失败通知
        const io = global.ioInstance;
        if (io && req.file) {
            io.emit('sftp-upload-complete', {
                sessionId: req.body.sessionId,
                fileName: req.file.originalname,
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: '文件上传失败: ' + error.message
        });
    } finally {
        // 确保临时文件被清理
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
                console.error('清理临时文件失败:', cleanupError);
            }
        }
    }
});

// 文件下载 - 流式传输，支持进度显示
router.get('/download', async (req, res) => {
    try {
        const { sessionId, path: remotePath } = req.query;

        if (!sessionId || !remotePath) {
            return res.status(400).json({
                success: false,
                message: '会话ID和路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        const filename = path.basename(remotePath);

        // 先获取文件大小（用于 Content-Length 和进度计算）
        let fileSize = 0;
        try {
            const stats = await sftpHandler.getFileStats(remotePath);
            fileSize = stats.size;
        } catch (statError) {
            // 无法获取文件大小，继续下载但不显示总进度
            console.warn('无法获取文件大小:', statError.message);
        }

        // 设置响应头
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        if (fileSize > 0) {
            res.setHeader('Content-Length', fileSize);
        }
        // 禁用缓冲，确保流式传输
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // 使用 SFTP 流式读取，直接管道到响应
        await new Promise((resolve, reject) => {
            const sftpStream = sftpHandler.sftp.createReadStream(remotePath, {
                highWaterMark: 256 * 1024 // 256KB 块大小，提升吞吐量
            });

            sftpStream.on('error', (err) => {
                console.error('SFTP 读取流错误:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: '文件读取失败: ' + err.message
                    });
                } else {
                    res.end();
                }
                reject(err);
            });

            sftpStream.on('end', () => {
                resolve();
            });

            // 管道传输：SFTP -> HTTP Response
            sftpStream.pipe(res);

            // 处理客户端断开连接
            req.on('aborted', () => {
                sftpStream.destroy();
            });
        });

    } catch (error) {
        console.error('快速文件下载错误:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: '文件下载失败: ' + error.message
            });
        }
    }
});

// 存储活跃的下载任务（用于取消和暂停）
const activeDownloads = new Map();

// 生成临时文件路径（用于断点续传）
const getTempFilePath = (localPath) => `${localPath}.download`;

// 文件下载到本地路径（Electron 环境，支持断点续传、进度回调和暂停）
// 通过 Socket.io 推送进度
router.post('/download-to-local', async (req, res) => {
    try {
        const { sessionId, remotePath, localPath } = req.body;

        if (!sessionId || !remotePath || !localPath) {
            return res.status(400).json({
                success: false,
                message: 'sessionId、远程路径和本地路径不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);

        // 获取远端文件大小和修改时间（添加超时）
        let remoteFileSize = 0;
        let remoteModifyTime = 0;
        try {
            const stats = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('获取文件大小超时'));
                }, 5000);
                
                sftpHandler.sftp.stat(remotePath, (err, stats) => {
                    clearTimeout(timeout);
                    if (err) {
                        reject(err);
                    } else {
                        resolve(stats);
                    }
                });
            });
            remoteFileSize = stats.size;
            remoteModifyTime = stats.modifyTime || stats.mtime * 1000 || Date.now();
        } catch (statError) {
            // 继续下载，但可能无法显示总进度
        }

        // 获取 Socket.io 实例
        const io = global.ioInstance;

        // 生成下载 ID
        const downloadId = `${sessionId}-${remotePath}`;

        // 临时文件路径
        const tempPath = getTempFilePath(localPath);

        // 如果是续传，等待一小段时间确保文件句柄完全释放（Windows 特殊处理）
        if (fs.existsSync(tempPath)) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 检查临时文件是否存在，获取已下载大小（断点续传）
        let existingSize = 0;
        let isResume = false;
        let remoteFileChanged = false;
        
        try {
            const tempStats = fs.statSync(tempPath);
            existingSize = tempStats.size;
            
            // 只有在成功获取到远端文件大小时才进行变化检测
            if (remoteFileSize > 0) {
                if (existingSize > 0 && existingSize < remoteFileSize) {
                    isResume = true;
                } else if (existingSize > remoteFileSize) {
                    remoteFileChanged = true;
                    existingSize = 0;
                    try {
                        fs.unlinkSync(tempPath);
                    } catch (e) {}
                }
            } else if (existingSize > 0) {
                // 无法获取远端文件大小，但临时文件存在，尝试续传
                isResume = true;
            }
        } catch (e) {
            // 临时文件不存在，正常下载
        }

        // 创建下载上下文
        const downloadContext = {
            paused: false,
            cancelled: false,
            localPath: localPath,
            tempPath: tempPath,
            existingSize: existingSize,
            remoteFileSize: remoteFileSize,
            remoteModifyTime: remoteModifyTime,
            stop: null
        };
        activeDownloads.set(downloadId, downloadContext);

        let loaded = existingSize; // 从已有大小开始计算
        let lastReportedTime = 0;

        try {
            await new Promise((resolve, reject) => {
                // ssh2 的 createReadStream 不支持 start 选项！
                // 断点续传需要使用 open + 手动读取的方式实现
                
                const highWaterMark = 256 * 1024;
                let sftpHandle = null; // SFTP 文件句柄
                let readPosition = existingSize; // 当前读取位置
                let writeStream = null;
                let shouldStop = false;

                // 创建写入流，追加模式
                const writeOptions = { flags: existingSize > 0 ? 'a' : 'w' };
                writeStream = fs.createWriteStream(tempPath, writeOptions);
                
                writeStream.on('error', (err) => {
                    shouldStop = true;
                    if (sftpHandle) {
                        sftpHandler.sftp.close(sftpHandle, () => {});
                    }
                    reject(err);
                });

                // 保存流引用，用于暂停/取消
                downloadContext.writeStream = writeStream;

                // 清理函数
                const cleanup = (removeTempFile = false) => {
                    shouldStop = true;
                    if (writeStream) {
                        writeStream.removeAllListeners();
                        try { writeStream.destroy(); } catch (e) {}
                        writeStream = null;
                    }
                    if (sftpHandle) {
                        try {
                            sftpHandler.sftp.close(sftpHandle, () => {});
                        } catch (e) {}
                        sftpHandle = null;
                    }
                    if (removeTempFile) {
                        try { fs.unlinkSync(tempPath); } catch (e) {}
                    }
                };

                // 读取数据的函数
                const readChunk = () => {
                    if (shouldStop || downloadContext.paused || downloadContext.cancelled) {
                        return;
                    }

                    const buffer = Buffer.allocUnsafe(highWaterMark);
                    
                    sftpHandler.sftp.read(sftpHandle, buffer, 0, highWaterMark, readPosition, (err, bytesRead, buffer) => {
                        if (shouldStop) return;
                        
                        if (err) {
                            if (err.code === 'EOF' || err.message === 'EOF') {
                                // 文件读取完成
                                writeStream.end(() => {
                                    resolve();
                                });
                                return;
                            }
                            // 检测连接断开的错误
                            if (err.message && (
                                err.message.includes('No response from server') ||
                                err.message.includes('Connection closed') ||
                                err.message.includes('ECONNRESET') ||
                                err.code === 'ECONNRESET'
                            )) {
                                // 连接断开，保留临时文件以便恢复
                                writeStream.end(() => {
                                    // 不删除临时文件，允许后续恢复
                                    reject(new Error('SFTP连接已断开，下载已暂停，可恢复续传'));
                                });
                                return;
                            }
                            cleanup();
                            reject(err);
                            return;
                        }

                        if (bytesRead === 0) {
                            // 读取完成
                            writeStream.end(() => {
                                resolve();
                            });
                            return;
                        }

                        // 写入数据
                        const data = buffer.slice(0, bytesRead);
                        const canWrite = writeStream.write(data);
                        
                        readPosition += bytesRead;
                        loaded += bytesRead;

                        // 每 500ms 推送一次进度
                        const now = Date.now();
                        if (io && now - lastReportedTime > 500) {
                            lastReportedTime = now;
                            const percent = remoteFileSize > 0 ? Math.floor((loaded / remoteFileSize) * 100) : 0;
                            io.emit('sftp-download-progress', {
                                downloadId,
                                sessionId,
                                remotePath,
                                localPath,
                                tempPath,
                                loaded,
                                total: remoteFileSize > 0 ? remoteFileSize : loaded,
                                percent,
                                isResume,
                                existingSize,
                                remoteFileChanged
                            });
                        }

                        // 如果写入缓冲区满了，等待 drain 事件
                        if (!canWrite) {
                            writeStream.once('drain', readChunk);
                        } else {
                            // 继续读取下一块
                            setImmediate(readChunk);
                        }
                    });
                };

                // 打开远程文件
                sftpHandler.sftp.open(remotePath, 'r', (err, handle) => {
                    if (err) {
                        cleanup();
                        reject(err);
                        return;
                    }

                    sftpHandle = handle;
                    downloadContext.sftpHandle = handle;

                    // 开始读取
                    readChunk();
                });

                // 处理暂停/取消
                downloadContext.stop = () => {
                    shouldStop = true;
                    cleanup(downloadContext.cancelled);
                    if (downloadContext.cancelled) {
                        reject(new Error('下载已取消'));
                    } else {
                        reject(new Error('下载已暂停'));
                    }
                };
            });

            // 下载完成，重命名临时文件为正式文件
            try {
                // 如果目标文件已存在，先删除
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
                fs.renameSync(tempPath, localPath);
            } catch (renameErr) {
                // 尝试复制
                try {
                    fs.copyFileSync(tempPath, localPath);
                    fs.unlinkSync(tempPath);
                } catch (copyErr) {
                    console.error('复制临时文件失败:', copyErr);
                }
            }

            res.json({
                success: true,
                message: isResume ? '断点续传下载成功' : '文件下载成功',
                localPath,
                size: remoteFileSize,
                isResume
            });

        } finally {
            // 清理下载上下文
            activeDownloads.delete(downloadId);
        }

    } catch (error) {
        // 如果是暂停或取消导致的错误，返回特定消息
        if (error.message === '下载已暂停' || error.message.includes('SFTP连接已断开')) {
            return res.json({
                success: false,
                paused: true,
                message: '下载已暂停，可恢复续传'
            });
        }
        if (error.message === '下载已取消') {
            return res.json({
                success: false,
                cancelled: true,
                message: '下载已取消'
            });
        }
        console.error('文件下载到本地错误:', error);
        res.status(500).json({
            success: false,
            message: '文件下载失败: ' + error.message
        });
    }
});

// 暂停下载（保留临时文件，支持断点续传）
router.post('/download-pause', async (req, res) => {
    try {
        const { sessionId, remotePath } = req.body;
        
        if (!sessionId || !remotePath) {
            return res.status(400).json({
                success: false,
                message: 'sessionId 和 remotePath 不能为空'
            });
        }
        
        const downloadId = `${sessionId}-${remotePath}`;
        const downloadContext = activeDownloads.get(downloadId);
        
        if (downloadContext) {
            downloadContext.paused = true;
            
            // 调用 stop 函数停止下载
            if (downloadContext.stop) {
                downloadContext.stop();
            }

            // 获取当前已下载大小
            let currentSize = 0;
            try {
                if (downloadContext.tempPath && fs.existsSync(downloadContext.tempPath)) {
                    currentSize = fs.statSync(downloadContext.tempPath).size;
                }
            } catch (e) {}

            // 保存 localPath 用于恢复
            const savedLocalPath = downloadContext.localPath;
            const savedTempPath = downloadContext.tempPath;

            // 从 activeDownloads 中移除，避免干扰恢复下载
            activeDownloads.delete(downloadId);

            res.json({
                success: true,
                message: '下载已暂停',
                tempPath: savedTempPath,
                localPath: savedLocalPath,
                downloadedSize: currentSize
            });
        } else {
            res.json({
                success: false,
                message: '未找到下载任务'
            });
        }
    } catch (error) {
        console.error('暂停下载错误:', error);
        res.status(500).json({
            success: false,
            message: '暂停下载失败: ' + error.message
        });
    }
});

// 取消下载（删除临时文件）
router.post('/download-cancel', async (req, res) => {
    try {
        const { sessionId, remotePath } = req.body;
        
        if (!sessionId || !remotePath) {
            return res.status(400).json({
                success: false,
                message: 'sessionId 和 remotePath 不能为空'
            });
        }
        
        const downloadId = `${sessionId}-${remotePath}`;
        const downloadContext = activeDownloads.get(downloadId);
        
        if (downloadContext) {
            downloadContext.cancelled = true;
            
            // 调用 stop 函数停止下载
            if (downloadContext.stop) {
                downloadContext.stop();
            }
            
            // 删除临时文件
            if (downloadContext.tempPath) {
                try {
                    fs.unlinkSync(downloadContext.tempPath);
                } catch (e) {
                    // 文件可能不存在，忽略错误
                }
            }

            res.json({
                success: true,
                message: '下载已取消'
            });
        } else {
            res.json({
                success: false,
                message: '未找到下载任务'
            });
        }
    } catch (error) {
        console.error('取消下载错误:', error);
        res.status(500).json({
            success: false,
            message: '取消下载失败: ' + error.message
        });
    }
});

// 获取下载任务状态（检查临时文件是否存在，支持恢复下载）
router.get('/download-status', async (req, res) => {
    try {
        const { sessionId, remotePath, localPath } = req.query;
        
        if (!sessionId || !remotePath || !localPath) {
            return res.status(400).json({
                success: false,
                message: 'sessionId、remotePath 和 localPath 不能为空'
            });
        }

        const sftpHandler = getQuickSftpConnection(sessionId);
        
        // 获取远端文件信息
        let remoteFileSize = 0;
        try {
            const stats = await sftpHandler.getFileStats(remotePath);
            remoteFileSize = stats.size;
        } catch (e) {
            return res.json({
                success: false,
                message: '无法获取远端文件信息'
            });
        }

        // 检查临时文件
        const tempPath = getTempFilePath(localPath);
        let tempExists = false;
        let tempSize = 0;
        
        try {
            const tempStats = fs.statSync(tempPath);
            tempExists = true;
            tempSize = tempStats.size;
        } catch (e) {
            // 临时文件不存在
        }

        // 检查正式文件是否已存在
        let fileComplete = false;
        try {
            const fileStats = fs.statSync(localPath);
            if (fileStats.size === remoteFileSize) {
                fileComplete = true;
            }
        } catch (e) {}

        res.json({
            success: true,
            remoteFileSize,
            tempExists,
            tempSize,
            tempPath,
            fileComplete,
            canResume: tempExists && tempSize > 0 && tempSize < remoteFileSize
        });
    } catch (error) {
        console.error('获取下载状态错误:', error);
        res.status(500).json({
            success: false,
            message: '获取下载状态失败: ' + error.message
        });
    }
});

module.exports = router;

// 导出 SFTP 连接池（供 socketHandler 使用）
module.exports.getSftpConnections = () => sftpConnections;