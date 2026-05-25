import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY = Buffer.from(env.encryptionKey.padEnd(32, '0').slice(0, 32));

export class EncryptionService {
  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  encryptIfSensitive(content: string): { content: string; isEncrypted: boolean } {
    const sensitivePatterns = [
      /\b\d{16,19}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /password\s*[:=]\s*\S+/i,
      /secret\s*[:=]\s*\S+/i,
      /token\s*[:=]\s*\S+/i,
      /api[_-]?key\s*[:=]\s*\S+/i,
    ];

    const isSensitive = sensitivePatterns.some((pattern) => pattern.test(content));

    if (isSensitive) {
      const encrypted = this.encrypt(content);
      return {
        content: JSON.stringify(encrypted),
        isEncrypted: true,
      };
    }

    return { content, isEncrypted: false };
  }
}

export const encryptionService = new EncryptionService();
