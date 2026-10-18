import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { env } from "@nonete/env/server"
import { z } from "zod"

// Encryption of a secret's values: AES-256-GCM under `SECRETS_ENCRYPTION_KEY`
// with a fresh 12-byte IV per write. The additional authenticated data binds
// the ciphertext to its row and owner, so a ciphertext copied into another
// row fails authentication instead of decrypting. A secret's fields are
// encrypted together, as one JSON object.

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12
const TAG_BYTES = 16

/** A secret's values, by field name. */
export type SecretValues = Record<string, string>

/** Where a ciphertext belongs: its row's id and owner. */
export type SecretBinding = { secretId: string; userId: string }

const valuesSchema = z.record(z.string(), z.string())

/** Whether the secrets feature is on: it needs the encryption key. */
export function secretsEnabled(): boolean {
  return env.SECRETS_ENCRYPTION_KEY !== undefined
}

function encryptionKey(): Buffer {
  const key = env.SECRETS_ENCRYPTION_KEY
  if (key === undefined) throw new Error("SECRETS_ENCRYPTION_KEY is not set")
  return Buffer.from(key, "base64")
}

function additionalData({ secretId, userId }: SecretBinding): Buffer {
  return Buffer.from(`secret:${secretId}:${userId}`, "utf8")
}

/** `values` encrypted for the row `binding`, as Base64 of iv ‖ data ‖ tag. */
export function encryptValues(
  values: SecretValues,
  binding: SecretBinding
): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv)
  cipher.setAAD(additionalData(binding))
  const data = Buffer.concat([
    cipher.update(JSON.stringify(values), "utf8"),
    cipher.final(),
  ])
  return Buffer.concat([iv, data, cipher.getAuthTag()]).toString("base64")
}

/**
 * The values `ciphertext` holds, or `null` when it can't be decrypted: the
 * key changed, the data is corrupt or it belongs to another row.
 */
export function decryptValues(
  ciphertext: string,
  binding: SecretBinding
): SecretValues | null {
  const bytes = Buffer.from(ciphertext, "base64")
  if (bytes.length < IV_BYTES + TAG_BYTES) return null
  const iv = bytes.subarray(0, IV_BYTES)
  const tag = bytes.subarray(bytes.length - TAG_BYTES)
  const data = bytes.subarray(IV_BYTES, bytes.length - TAG_BYTES)
  try {
    const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv)
    decipher.setAAD(additionalData(binding))
    decipher.setAuthTag(tag)
    const text = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]).toString("utf8")
    const parsed = valuesSchema.safeParse(JSON.parse(text))
    if (!parsed.success) return null
    return parsed.data
  } catch {
    return null
  }
}
