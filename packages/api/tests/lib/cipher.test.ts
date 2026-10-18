import { beforeEach, describe, expect, test } from "bun:test"
import { resetEnv, testEnv } from "#tests/fixtures/env"
import { decryptValues, encryptValues, secretsEnabled } from "#v1/secret/cipher"

const KEY = Buffer.alloc(32, 7).toString("base64")
const OTHER_KEY = Buffer.alloc(32, 9).toString("base64")
const binding = { secretId: "secret-1", userId: "user-id" }
const values = { key: "abc123secret", secret: "s3cr3t-value" }

beforeEach(() => {
  resetEnv()
  testEnv.SECRETS_ENCRYPTION_KEY = KEY
})

describe("secretsEnabled", () => {
  test("is off without the key and on with it", () => {
    testEnv.SECRETS_ENCRYPTION_KEY = undefined
    expect(secretsEnabled()).toBe(false)
    testEnv.SECRETS_ENCRYPTION_KEY = KEY
    expect(secretsEnabled()).toBe(true)
  })
})

describe("encryptValues", () => {
  test("decrypts back to the same values for the same row", () => {
    const ciphertext = encryptValues(values, binding)

    expect(decryptValues(ciphertext, binding)).toEqual(values)
  })

  test("never holds a value in plain text, and differs on every write", () => {
    const first = encryptValues(values, binding)
    const second = encryptValues(values, binding)

    const decoded = Buffer.from(first, "base64").toString("latin1")
    expect(first).not.toContain("abc123secret")
    expect(decoded).not.toContain("abc123secret")
    expect(first).not.toBe(second)
  })
})

describe("decryptValues", () => {
  test("is null under another key", () => {
    const ciphertext = encryptValues(values, binding)
    testEnv.SECRETS_ENCRYPTION_KEY = OTHER_KEY

    expect(decryptValues(ciphertext, binding)).toBeNull()
  })

  test("is null for another row or another owner", () => {
    const ciphertext = encryptValues(values, binding)

    expect(
      decryptValues(ciphertext, { ...binding, secretId: "secret-2" })
    ).toBeNull()
    expect(
      decryptValues(ciphertext, { ...binding, userId: "other-id" })
    ).toBeNull()
  })

  test("is null for a tampered or truncated ciphertext", () => {
    const bytes = Buffer.from(encryptValues(values, binding), "base64")
    const tampered = Buffer.from(bytes)
    tampered[14] = (tampered[14] ?? 0) ^ 1

    expect(decryptValues(tampered.toString("base64"), binding)).toBeNull()
    expect(decryptValues("c2hvcnQ=", binding)).toBeNull()
  })
})
