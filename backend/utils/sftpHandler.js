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
   * @returns {Promise<void>}
   */
  async uploadFileWithProgress(localPath, remotePath, onProgress = null) {
    if (!this.isConnected) {
      throw new Error('SFTP not connected');
    }

    return new Promise((resolve, reject) => {
      // 获取本地文件大小
      const stats = fs.statSync(localPath);
      const totalSize = stats.size;
      let loaded = 0;
      let lastReportedPercent = -1;
      let isCancelled = false;

      // 创建本地文件读取流
      const readStream = fs.createReadStream(localPath, {
        highWaterMark: 64 * 1024 // 64KB 块大小，平衡内存和进度更新频率
      });

      // 创建远程文件写入流
      const writeStream = this.sftp.createWriteStream(remotePath);

      // 监听读取流的数据事件，计算进度
      readStream.on('data', (chunk) => {
        // 检查是否已取消
        if (isCancelled) {
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
              readStream.destroy();
              writeStream.destroy();
              reject(new Error('上传已取消'));
            }
          } catch (err) {
            // 如果回调抛出异常，检查是否是取消操作
            if (err.message === '上传已取消') {
              isCancelled = true;
              readStream.destroy();
              writeStream.destroy();
              reject(err);
            } else {
              // 其他异常继续传播
              console.error('进度回调异常:', err);
            }
          }
        }
      });

      // 处理错误
      readStream.on('error', (err) => {
        if (!isCancelled) {
          writeStream.destroy();
          reject(new Error(`读取本地文件失败: ${err.message}`));
        }
      });

      writeStream.on('error', (err) => {
        if (!isCancelled) {
          readStream.destroy();
          reject(new Error(`上传到远程服务器失败: ${err.message}`));
        }
      });

      // 上传完成
      writeStream.on('close', () => {
        if (isCancelled) {
          return;
        }
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
