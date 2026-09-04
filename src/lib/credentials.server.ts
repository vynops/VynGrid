import 'server-only'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

interface ProductCredential {
  username: string
  password: string
}

interface EncryptedStore {
  [productId: string]: { iv: string; tag: string; data: string }
}

const STORE_PATH = path.join(process.cwd(), 'data', 'product-credentials.enc.json')

function key(): Buffer {
  const value = process.env.VYNGRID_CREDENTIALS_ENCRYPTION_KEY
  if (!value) throw new Error('VYNGRID_CREDENTIALS_ENCRYPTION_KEY is not configured')
  return crypto.createHash('sha256').update(value).digest()
}

function readStore(): EncryptedStore {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) as EncryptedStore } catch { return {} }
}

function writeStore(store: EncryptedStore) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), { encoding: 'utf8', mode: 0o600 })
}

export function credentialConfigured(productId: string): boolean {
  return Boolean(readStore()[productId])
}

export function saveCredential(productId: string, credential: ProductCredential) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(credential), 'utf8'), cipher.final()])
  const store = readStore()
  store[productId] = {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  }
  writeStore(store)
}

export function readCredential(productId: string): ProductCredential | null {
  const record = readStore()[productId]
  if (!record) return null
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(record.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(record.data, 'base64')), decipher.final()]).toString('utf8')) as ProductCredential
}