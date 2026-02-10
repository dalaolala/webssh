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
      this.sshClient.end();
    }
    this.isConnected = false;
    this.sftp = null;
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
