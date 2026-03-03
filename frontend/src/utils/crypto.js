import axios from 'axios';
import forge from 'node-forge';
import CryptoJS from 'crypto-js';

let publicKeyCache = null;

/**
 * 获取后端 RSA 公钥
 */
export async function getPublicKey() {
    if (publicKeyCache) return publicKeyCache;
    try {
        const response = await axios.get('/api/crypto/public-key');
        publicKeyCache = response.data.publicKey;
        return publicKeyCache;
    } catch (error) {
        console.error('获取公钥失败:', error);
        throw error;
    }
}

/**
 * 混合加密传输数据 (RSA + AES)
 * @param {Object} data 原始对象数据
 * @returns {Promise<{key: string, data: string}>} 加密后的 payload
 */
export async function encryptPayload(data) {
    const pubKey = await getPublicKey();

    // 1. 生成一次性 AES-256 密钥 (32字节) 和 IV (16字节)
    const aesKeyStr = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    const ivStr = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);

    // 2. 使用 AES 加密真实数据
    const payloadStr = JSON.stringify(data);
    const encryptedData = CryptoJS.AES.encrypt(payloadStr, CryptoJS.enc.Hex.parse(aesKeyStr), {
        iv: CryptoJS.enc.Hex.parse(ivStr),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    }).toString(); // 自动输出 base64

    // 3. 使用 RSA-OAEP 加密 AES 密钥和 IV
    const publicKeyObj = forge.pki.publicKeyFromPem(pubKey);
    const sessionKeyObj = JSON.stringify({ key: aesKeyStr, iv: ivStr });

    // forge 的 encrypt 默认使用 RSAES-PKCS1-V1_5，若需要 OAEP：
    const encryptedKeyBytes = publicKeyObj.encrypt(sessionKeyObj, 'RSA-OAEP', {
        md: forge.md.sha1.create(),
        mgf1: {
            md: forge.md.sha1.create()
        }
    });

    const encryptedKey = forge.util.encode64(encryptedKeyBytes);

    if (!encryptedKey) {
        throw new Error('RSA 加密失败，可能是数据过长或公钥无效');
    }

    return {
        key: encryptedKey,
        data: encryptedData
    };
}
