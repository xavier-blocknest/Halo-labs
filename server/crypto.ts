// Encryption at rest for health data (WHOOP API terms §2.4 require it; the disk itself is not encrypted).
// AES-256-GCM, key in .env as HALO_DB_KEY. Lose the key and the stored data is unreadable: back up .env.
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'
import { appendFileSync, chmodSync, existsSync, readFileSync } from 'node:fs'

let key: Buffer

/** Load HALO_DB_KEY. A new key is generated only for a brand-new install (no database yet): generating one
 *  next to existing data would make it unreadable, and a second key line in .env would win over the first. */
export function loadKey(envFile: string, dbFile: string) {
  const lines = existsSync(envFile) ? readFileSync(envFile, 'utf8').split('\n').filter(l => /^\s*HALO_DB_KEY\s*=/.test(l)).length : 0
  if (lines > 1) throw new Error(`${envFile} has ${lines} HALO_DB_KEY lines; keep only the original one (the first) and restart`)
  let b64 = process.env.HALO_DB_KEY
  if (!b64) {
    if (existsSync(dbFile)) throw new Error(`HALO_DB_KEY is missing but ${dbFile} exists; refusing to generate a new key (restore .env from backup)`)
    b64 = randomBytes(32).toString('base64')
    appendFileSync(envFile, `${existsSync(envFile) ? '\n' : ''}HALO_DB_KEY=${b64}\n`, { mode: 0o600 })
    chmodSync(envFile, 0o600)
    process.env.HALO_DB_KEY = b64
    console.log(`Generated a database encryption key in ${envFile}. Back it up: without it the data can't be read.`)
  }
  key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('HALO_DB_KEY must be 32 bytes, base64-encoded')
}

/** iv (12) | tag (16) | ciphertext */
export function seal(value: unknown): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

export function open<T = unknown>(blob: Uint8Array): T {
  const buf = Buffer.from(blob)
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8'))
}

/** Encrypt raw bytes (archived original files). Same layout as seal(). */
export function sealBytes(data: Uint8Array): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(data), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

export function openBytes(blob: Uint8Array): Buffer {
  const buf = Buffer.from(blob)
  const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()])
}

/** Opaque, stable identifier for a natural key (e.g. "2026-02-12|LDL-CHOLESTEROL"), so row keys in the
 *  database reveal nothing while upserts still find the same row. */
export function tag(text: string): string {
  return createHmac('sha256', key).update(`halolabs-id:${text}`).digest('base64url').slice(0, 32)
}
