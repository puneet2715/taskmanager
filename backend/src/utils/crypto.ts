import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'

// Simple in-memory RSA keypair. In production, use a persistent KMS or env-seeded key.
// Generate once on process start.
const RSA_KEY_SIZE = 2048
const keyPair = crypto.generateKeyPairSync('rsa', {
  modulusLength: RSA_KEY_SIZE,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const keyId = crypto.createHash('sha256').update(keyPair.publicKey).digest('hex').slice(0, 16)

export const cryptoController = {
  getPublicKey: (_req: Request, res: Response) => {
    res.json({
      keyId,
      algorithm: 'rsa-oaep-256',
      publicKeyPem: keyPair.publicKey,
    })
  },
}

export function tryDecryptPasswordFromBody(req: Request, _res: Response, next: NextFunction) {
  try {
    const maybeEncrypted = req.body?.encryptedPassword
    const scheme = req.body?.encryptionScheme
    const sentKeyId = req.body?.keyId

    if (maybeEncrypted && scheme === 'rsa-oaep-256' && sentKeyId === keyId) {
      const ciphertext = Buffer.from(maybeEncrypted, 'base64')
      const plaintext = crypto.privateDecrypt(
        {
          key: keyPair.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        ciphertext
      )
      const password = plaintext.toString('utf8')
      // Replace fields so downstream uses plaintext transparently
      req.body.password = password
      delete req.body.encryptedPassword
      delete req.body.encryptionScheme
      delete req.body.keyId
    }
  } catch (_e) {
    // If decryption fails, continue; validation will fail as needed
  }
  next()
}
















