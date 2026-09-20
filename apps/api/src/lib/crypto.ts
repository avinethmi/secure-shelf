import argon2 from 'argon2';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

// NFR-01: Argon2id, memory 19 MiB (19456 KiB), 2 iterations, parallelism 1. These are the
// OWASP minimum recommended parameters for Argon2id.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const hashPassword = (password: string) => argon2.hash(password, ARGON2_OPTIONS);

export const verifyPassword = async (hash: string, password: string) => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

// Used when the email is unknown so the response takes as long as a real verification
// (FR-02: same behaviour for unknown email and wrong password).
let dummyHashPromise: Promise<string> | undefined;
export const dummyVerify = async () => {
  dummyHashPromise ??= hashPassword(crypto.randomBytes(16).toString('hex'));
  await argon2.verify(await dummyHashPromise, 'not-the-password');
};

// NFR-05: AES-256-GCM for NIC, phone, contact details and TOTP secrets. Output is
// base64(iv).base64(tag).base64(ciphertext). A fresh 96-bit IV per value.
const fieldKey = Buffer.from(env.FIELD_ENCRYPTION_KEY, 'base64');

export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', fieldKey, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const [ivB64, tagB64, ctB64] = stored.split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed encrypted field');
  const decipher = crypto.createDecipheriv('aes-256-gcm', fieldKey, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

// Masks for display to callers without users.manage (e.g. "•••• 5678").
export function maskTail(value: string | null, keep = 4): string | null {
  if (!value) return null;
  return value.length <= keep ? '••••' : `•••• ${value.slice(-keep)}`;
}

export const sha256Hex = (input: string | Buffer) => crypto.createHash('sha256').update(input).digest('hex');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const randomId = () => crypto.randomUUID();
