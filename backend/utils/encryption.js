const crypto = require('crypto');

// 本地存储加密密钥（用于本地存储的加密）
const LOCAL_STORAGE_KEY = 'webssh-quick-connect-local-2026';

// 生成随机盐
function generateSalt(length = 16) {
    return crypto.randomBytes(length).toString('hex');
}

// 使用 AES-256 加密数据
function encryptData(data, key = LOCAL_STORAGE_KEY) {
    try {
        const CryptoJS = require('crypto-js');
        
        // 生成随机的 IV
        const iv = CryptoJS.lib.WordArray.random(16);
        
        // 加密数据
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        // 返回 IV + 加密数据（base64编码）
        const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
        const encryptedBase64 = encrypted.toString();
        
        return ivBase64 + ':' + encryptedBase64;
        
    } catch (error) {
        console.error('加密数据失败:', error);
        throw new Error('数据加密失败');
    }
}

// 使用 AES-256 解密数据
function decryptData(encryptedData, key = LOCAL_STORAGE_KEY) {
    try {
        const CryptoJS = require('crypto-js');
        
        // 分离 IV 和加密数据
        const parts = encryptedData.split(':');
        if (parts.length !== 2) {
            throw new Error('无效的加密数据格式');
        }
        
        const ivBase64 = parts[0];
        const encryptedBase64 = parts[1];
        
        // 解码 IV
        const iv = CryptoJS.enc.Base64.parse(ivBase64);
        
        // 解密数据
        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedStr) {
            throw new Error('解密失败，可能是密钥错误或数据损坏');
        }
        
        return JSON.parse(decryptedStr);
        
    } catch (error) {
        console.error('解密数据失败:', error);
        throw new Error('数据解密失败: ' + error.message);
    }
}

// 哈希密码（用于本地存储的密码保护）
function hashPassword(password, salt) {
    const CryptoJS = require('crypto-js');
    return CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 1000
    }).toString();
}

// 验证密码哈希
function verifyPassword(password, hash, salt) {
    const newHash = hashPassword(password, salt);
    return newHash === hash;
}

module.exports = {
    generateSalt,
    encryptData,
    decryptData,
    hashPassword,
    verifyPassword,
    LOCAL_STORAGE_KEY
};