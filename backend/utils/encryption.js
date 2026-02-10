const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class EncryptionService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32bytes-long';
    if (!this.encryptionKey || this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes long');
    }
  }

  /**
   * 生成用户特定的加密密钥（基于用户ID）
   */
  generateUserKey(userId) {
    const userKey = crypto.createHash('sha256')
      .update(this.encryptionKey + userId.toString())
      .digest('hex')
      .substring(0, 32);
    return userKey;
  }

  /**
   * 加密数据
   */
  encrypt(data, userId) {
    if (!data) return null;
    
    const userKey = this.generateUserKey(userId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, userKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // 返回 IV + AuthTag + EncryptedData
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }

  /**
   * 解密数据
   */
  decrypt(encryptedData, userId) {
    if (!encryptedData) return null;
    
    try {
      const userKey = this.generateUserKey(userId);
      
      // 提取 IV、AuthTag 和加密数据
      const iv = Buffer.from(encryptedData.substring(0, IV_LENGTH * 2), 'hex');
      const authTag = Buffer.from(
        encryptedData.substring(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2), 
        'hex'
      );
      const encrypted = encryptedData.substring(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);
      
      const decipher = crypto.createDecipheriv(ALGORITHM, userKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * 加密服务器密码
   */
  encryptPassword(password, userId) {
    return this.encrypt(password, userId);
  }

  /**
   * 解密服务器密码
   */
  decryptPassword(encryptedPassword, userId) {
    return this.decrypt(encryptedPassword, userId);
  }

  /**
   * 加密私钥
   */
  encryptPrivateKey(privateKey, userId) {
    return this.encrypt(privateKey, userId);
  }

  /**
   * 解密私钥
   */
  decryptPrivateKey(encryptedPrivateKey, userId) {
    return this.decrypt(encryptedPrivateKey, userId);
  }
}

module.exports = new EncryptionService();