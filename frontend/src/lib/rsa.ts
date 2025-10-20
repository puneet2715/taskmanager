// Lightweight RSA-OAEP (SHA-256) helpers for client-side password encryption
// Uses Web Crypto SubtleCrypto available in modern browsers

export interface BackendPublicKeyInfo {
  keyId: string
  algorithm: string
  publicKeyPem: string
}

let cachedKeyInfo: BackendPublicKeyInfo | null = null
let cachedCryptoKey: CryptoKey | null = null

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '')
  const binaryString = typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export async function fetchBackendPublicKey(apiBaseUrl: string): Promise<BackendPublicKeyInfo> {
  if (cachedKeyInfo) return cachedKeyInfo
  const res = await fetch(`${apiBaseUrl}/api/auth/public-key`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error('Failed to fetch backend public key')
  }
  const data = (await res.json()) as BackendPublicKeyInfo
  cachedKeyInfo = data
  return data
}

async function getImportedPublicKey(publicKeyPem: string): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey
  const keyBuffer = pemToArrayBuffer(publicKeyPem)
  const cryptoKey = await window.crypto.subtle.importKey(
    'spki',
    keyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
  cachedCryptoKey = cryptoKey
  return cryptoKey
}

export async function encryptPassword(password: string, apiBaseUrl: string): Promise<{ encrypted: string; keyId: string; scheme: 'rsa-oaep-256' | 'plain' }> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return { encrypted: password, keyId: 'plain', scheme: 'plain' }
  }
  const keyInfo = await fetchBackendPublicKey(apiBaseUrl)
  const cryptoKey = await getImportedPublicKey(keyInfo.publicKeyPem)
  const encoded = new TextEncoder().encode(password)
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, cryptoKey, encoded)
  const b64 = typeof btoa !== 'undefined' ? btoa(String.fromCharCode(...new Uint8Array(ciphertext))) : Buffer.from(new Uint8Array(ciphertext)).toString('base64')
  return { encrypted: b64, keyId: keyInfo.keyId, scheme: 'rsa-oaep-256' }
}


