const crypto = require('crypto');

let publicKey = null;
let privateKey = null;

function initKeys() {
    if (publicKey && privateKey) return;
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    publicKey = pub;
    privateKey = priv;
}

function getPublicKey() {
    if (!publicKey) initKeys();
    return publicKey;
}

function decryptPayload(encryptedAesKeyBase64, encryptedDataBase64) {
    if (!privateKey) throw new Error('Keys not initialized');
    // 1. RSA 解密 AES 密钥 (使用 OAEP)
    const encryptedAesKeyBuffer = Buffer.from(encryptedAesKeyBase64, 'base64');
    const aesKeyStr = crypto.privateDecrypt(
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
        encryptedAesKeyBuffer
    ).toString('utf8');

    const { key, iv } = JSON.parse(aesKeyStr);

    // 2. AES 解密数据
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedDataBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
}

module.exports = { initKeys, getPublicKey, decryptPayload };
