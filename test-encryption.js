// Test script for AES-256-GCM encryption
// Run with: node test-encryption.js

const crypto = require('crypto');

const ENCRYPTION_KEY = 'c60a14d94f6e49e0033f1b9e53feb9ecdbd8074de7ef83392e362405ac692414';

function encryptToken(token) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `v2:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptToken(encryptedToken) {
    const parts = encryptedToken.split(':');
    const [version, ivHex, authTagHex, encrypted] = parts;

    if (version !== 'v2') {
        throw new Error(`Unsupported version: ${version}`);
    }

    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

// Test
console.log('🔐 Testing AES-256-GCM Encryption\n');

const testToken = 'test_ksef_token_1234567890';
console.log('Original token:', testToken);

const encrypted = encryptToken(testToken);
console.log('\nEncrypted:', encrypted);
console.log('Length:', encrypted.length, 'chars');

const decrypted = decryptToken(encrypted);
console.log('\nDecrypted:', decrypted);

console.log('\n✅ Test', testToken === decrypted ? 'PASSED' : 'FAILED');

// Test multiple encryptions produce different results
const encrypted2 = encryptToken(testToken);
console.log('\n🔄 Same token, different encryption:', encrypted !== encrypted2 ? 'YES ✅' : 'NO ❌');
