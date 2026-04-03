import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);
const randomBytes = promisify(crypto.randomBytes);

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

export interface PasswordHash {
  salt: string;
  hash: string;
}

export async function hashPassword(password: string): Promise<string> {
  const saltBuffer = (await randomBytes(SALT_LENGTH)) as Buffer;
  const salt = saltBuffer.toString('base64');

  const derivedKey = (await scrypt(
    password,
    saltBuffer,
    KEY_LENGTH
  )) as Buffer;

  const hash = derivedKey.toString('base64');

  return JSON.stringify({ salt, hash });
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    const { salt, hash: expectedHash } = JSON.parse(storedHash) as PasswordHash;
    const saltBuffer = Buffer.from(salt, 'base64');

    const derivedKey = (await scrypt(
      password,
      saltBuffer,
      KEY_LENGTH
    )) as Buffer;

    const actualHash = derivedKey.toString('base64');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'base64'),
      Buffer.from(actualHash, 'base64')
    );
  } catch {
    return false;
  }
}
