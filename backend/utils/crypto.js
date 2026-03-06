const crypto = require('crypto');
const forge = require('node-forge');

// 生成 RSA 密钥对（内存中存储，不需要文件持久化）
let keyPair = null;

// 初始化密钥对
function initKeyPair() {
    if (!keyPair) {
        // 直接生成新的密钥对，不需要文件存储
        keyPair = generateKeyPair();
        console.log('RSA密钥对已生成（内存存储）');
    }
    return keyPair;
}

// 生成新的 RSA 密钥对
function generateKeyPair() {
    const keypair = forge.pki.rsa.generateKeyPair({
        bits: 2048,
        e: 0x10001
    });
    
    return {
        privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
        publicKey: forge.pki.publicKeyToPem(keypair.publicKey)
    };
}

// 获取公钥
function getPublicKey() {
    const keys = initKeyPair();
    return keys.publicKey;
}

// 解密数据（RSA 解密 AES 密钥，然后 AES 解密实际数据）
function decryptPayload(encryptedKey, encryptedData) {
    try {
        const keys = initKeyPair();
        const privateKey = forge.pki.privateKeyFromPem(keys.privateKey);
        
        // 1. RSA 解密 AES 密钥
        const keyBytes = forge.util.decode64(encryptedKey);
        const sessionKeyStr = privateKey.decrypt(keyBytes, 'RSA-OAEP', {
            md: forge.md.sha1.create(),
            mgf1: {
                md: forge.md.sha1.create()
            }
        });
        
        const sessionKey = JSON.parse(sessionKeyStr);
        
        // 2. AES 解密实际数据
        const CryptoJS = require('crypto-js');
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, CryptoJS.enc.Hex.parse(sessionKey.key), {
            iv: CryptoJS.enc.Hex.parse(sessionKey.iv),
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        const decryptedStr = decryptedBytes.toString(CryptoJS.enc.Utf8);
        
        if (!decryptedStr) {
            throw new Error('AES 解密失败，可能是密钥或数据损坏');
        }
        
        return JSON.parse(decryptedStr);
        
    } catch (error) {
        console.error('解密失败:', error);
        throw new Error('数据解密失败: ' + error.message);
    }
}

// 创建 SFTP 路由使用的加密中间件
function createCryptoMiddleware() {
    return (req, res, next) => {
        try {
            // 如果请求体包含加密数据，先解密
            if (req.body && req.body.key && req.body.data) {
                const decryptedData = decryptPayload(req.body.key, req.body.data);
                req.body = { ...req.body, ...decryptedData };
            }
            next();
        } catch (error) {
            console.error('加密中间件错误:', error);
            res.status(400).json({
                success: false,
                message: '数据解密失败: ' + error.message
            });
        }
    };
}

module.exports = {
    initKeyPair,
    getPublicKey,
    decryptPayload,
    createCryptoMiddleware
};