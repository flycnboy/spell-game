// 用 Web Crypto（AES-GCM + PBKDF2）加密 GitHub Token，避免明文落盘。
// 依赖浏览器 / Node18+ 的 globalThis.crypto.subtle。
// 说明：纯前端无安全后端，加密的「安全」来自「同步密码」不在静态存储中；
// 若选择「记住密码」，密码会与 Token 一同明文存于本机，仅为便利、不提升安全性。

const enc = new TextEncoder();
const dec = new TextDecoder();
const PBKDF2_ITER = 100_000;

function getSubtle(): any {
  const c: any = (globalThis as any).crypto;
  if (!c || !c.subtle) {
    throw new Error('当前环境不支持 Web Crypto（需 HTTPS 或 localhost）');
  }
  return c.subtle;
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return (globalThis as any).btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = (globalThis as any).atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<any> {
  const subtle = getSubtle();
  const baseKey = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface Encrypted {
  cipher: string; // base64
  salt: string;   // base64
  iv: string;     // base64
}

// 用同步密码加密明文（Token）
export async function encryptString(plain: string, passphrase: string): Promise<Encrypted> {
  const subtle = getSubtle();
  const c: any = (globalThis as any).crypto;
  const salt = c.getRandomValues(new Uint8Array(16));
  const iv = c.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipherBuf = await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return { cipher: toB64(cipherBuf), salt: toB64(salt), iv: toB64(iv) };
}

// 用同步密码解密；密码错误会抛异常（AES-GCM 认证失败）
export async function decryptString(e: Encrypted, passphrase: string): Promise<string> {
  const subtle = getSubtle();
  const key = await deriveKey(passphrase, fromB64(e.salt));
  const plainBuf = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(e.iv) }, key, fromB64(e.cipher));
  return dec.decode(plainBuf);
}
