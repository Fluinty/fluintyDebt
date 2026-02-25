/**
 * Encryption utilities for storing sensitive data (cert passwords, tokens)
 * Uses AES-256-GCM with random IV, authenticated encryption.
 * 
 * Requires ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;     // 128 bits
const TAG_LENGTH = 16;    // 128 bits (GCM auth tag)
const ENCODING = 'hex';

function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string.
 * Returns: iv:authTag:ciphertext (all hex-encoded, colon-separated)
 */
export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    // Format: iv:tag:ciphertext
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
}

/**
 * Decrypt a string encrypted by encrypt().
 * Input format: iv:authTag:ciphertext (hex-encoded)
 */
export function decrypt(encryptedData: string): string {
    const key = getKey();
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format (expected iv:tag:ciphertext)');
    }

    const [ivHex, tagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(tagHex, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
