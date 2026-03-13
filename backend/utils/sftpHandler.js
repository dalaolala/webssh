const { Client } = require('ssh2');
const path = require('path');
const fs = require('fs');

class SftpHandler {
  constructor(serverConfig) {
    this.serverConfig = serverConfig;
    this.sshClient = new Client();
    this.sftp = null;
    this.isConnected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.sshClient.on('ready', () => {
        this.sshClient.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }
          this.sftp = sftp;
          this.isConnected = true;
          resolve(sftp);
        });
      }).on('error', (err) => {
        reject(err);
      }).connect({
        host: this.serverConfig.host,
        port: this.serverConfig.port || 22,
        username: this.serverConfig.username,
        password: this.serverConfig.password,
        privateKey: this.serverConfig.privateKey,
        readyTimeout: 20000
      });
    });
  }

  async disconnect() {
    if (this.sshClient) {
      try {
        this.sshClient.end()
      } catch (error) {
        console.error('断开SFTP连接时出错:', error)
      }
    }
    this.isConnected = false
    this.sftp = null
    this.sshClient = null
  }

  async listDirectory(directory = '.') {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.readdir(directory, (err, list) => {
        if (err) {
          reject(err);
          return;
        }

        const files = list.map(item => {
          const isDirectory = item.longname.startsWith('d');
          const isSymlink = item.longname.startsWith('l');
          
          return {
            name: item.filename,
            path: path.posix.join(directory === '.' ? '' : directory, item.filename),
            type: isDirectory ? 'directory' : (isSymlink ? 'symlink' : 'file'),
            size: item.attrs.size,
            modified: item.attrs.mtime,
            permissions: item.attrs.mode.toString(8).slice(-3),
            owner: item.attrs.uid,
            group: item.attrs.gid
          };
        });

        // 排序：目录在前，文件在后
        files.sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });

        resolve(files);
      });
    });
  }

  async getFileContent(filePath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  /**
   * 上传文件（无进度回调，兼容旧接口）
   */
  async uploadFile(localPath, remotePath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * 流式上传文件（支持实时进度回调）
   * 使用 createReadStream + createWriteStream 实现流式传输，适合大文件
   * @param {string} localPath - 本地文件绝对路径
   * @param {string} remotePath - 远程目标路径
   * @param {function} onProgress - 进度回调，返回 false 时取消上传
   * @param {number} startPosition - 断点续传起始位置，默认 0
   * @returns {Promise<void>}
   */
  async uploadFileWithProgress(localPath, remotePath, onProgress = null, startPosition = 0) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      // 获取本地文件大小
      const stats = fs.statSync(localPath);
      const totalSize = stats.size;
      let loaded = startPosition; // 从断点位置开始计算
      let lastReportedPercent = startPosition > 0 ? Math.floor((startPosition / totalSize) * 100) : -1;
      let isCancelled = false;
      let isResolved = false;

      // 创建本地文件读取流，从断点位置开始
      const readStream = fs.createReadStream(localPath, {
        start: startPosition,
        highWaterMark: 64 * 1024 // 64KB 块大小，平衡内存和进度更新频率
      });

      // 创建远程文件写入流（追加模式）
      const writeStream = this.sftp.createWriteStream(remotePath, {
        flags: startPosition > 0 ? 'a' : 'w' // 'a' 追加模式，'w' 覆盖模式
      });

      // 统一的清理函数，避免内存泄漏
      const cleanup = (error) => {
        if (isResolved) return;
        isResolved = true;

        // 先解绑管道
        readStream.unpipe(writeStream);

        // 销毁流
        readStream.destroy();
        writeStream.destroy();

        // 移除所有事件监听器
        readStream.removeAllListeners();
        writeStream.removeAllListeners();

        if (error) {
          reject(error);
        }
      };

      // 检查取消状态的函数
      const checkCancelled = () => {
        if (onProgress) {
          try {
            const result = onProgress({
              loaded,
              total: totalSize,
              percent: Math.floor((loaded / totalSize) * 100),
              checkOnly: true // 标记这只是检查取消状态
            });
            if (result === false) {
              isCancelled = true;
              cleanup(new Error('上传已取消'));
              return true;
            }
          } catch (err) {
            if (err.message === '上传已取消') {
              isCancelled = true;
              cleanup(err);
              return true;
            }
          }
        }
        return false;
      };

      // 监听读取流的数据事件，计算进度
      readStream.on('data', (chunk) => {
        // 检查是否已取消
        if (isCancelled || isResolved) {
          return;
        }

        // 每次收到数据都检查取消状态（确保及时响应取消请求）
        if (checkCancelled()) {
          return;
        }

        loaded += chunk.length;
        const percent = Math.floor((loaded / totalSize) * 100);

        // 每 1% 更新一次进度（避免过于频繁的回调）
        if (onProgress && percent !== lastReportedPercent) {
          lastReportedPercent = percent;
          try {
            const result = onProgress({
              loaded,
              total: totalSize,
              percent
            });
            // 如果回调返回 false，取消上传
            if (result === false) {
              isCancelled = true;
              cleanup(new Error('上传已取消'));
            }
          } catch (err) {
            // 如果回调抛出异常，检查是否是取消操作
            if (err.message === '上传已取消') {
              isCancelled = true;
              cleanup(err);
            } else {
              console.error('进度回调异常:', err);
            }
          }
        } else {
          // 即使没有进度更新，也定期检查取消状态（每 256KB 检查一次）
          if (loaded % (256 * 1024) < chunk.length) {
            checkCancelled();
          }
        }
      });

      // 处理错误
      readStream.on('error', (err) => {
        if (!isCancelled && !isResolved) {
          cleanup(new Error(`读取本地文件失败: ${err.message}`));
        }
      });

      writeStream.on('error', (err) => {
        if (!isCancelled && !isResolved) {
          cleanup(new Error(`上传到远程服务器失败: ${err.message}`));
        }
      });

      // 上传完成
      writeStream.on('close', () => {
        if (isCancelled || isResolved) {
          return;
        }
        isResolved = true;

        // 确保最终进度为 100%
        if (onProgress && lastReportedPercent !== 100) {
          onProgress({
            loaded: totalSize,
            total: totalSize,
            percent: 100
          });
        }
        resolve();
      });

      // 管道传输：读取流 -> 写入流
      readStream.pipe(writeStream);
    });
  }

  /**
   * 获取远程文件大小（用于断点续传）
   * @param {string} remotePath - 远程文件路径
   * @returns {Promise<number>} 文件大小，不存在返回 0
   */
  async getRemoteFileSize(remotePath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve) => {
      this.sftp.stat(remotePath, (err, stats) => {
        if (err) {
          // 文件不存在或其他错误，返回 0
          resolve(0);
          return;
        }
        resolve(stats.size);
      });
    });
  }

  async downloadFile(remotePath, localPath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.fastGet(remotePath, localPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async createDirectory(remotePath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.mkdir(remotePath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async deleteFile(remotePath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.unlink(remotePath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async deleteDirectory(remotePath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.rmdir(remotePath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async renameFile(oldPath, newPath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.rename(oldPath, newPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async getFileStats(remotePath) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      this.sftp.stat(remotePath, (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(stats);
      });
    });
  }
}

module.exports = SftpHandler;
