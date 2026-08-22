/**
 * Encrypting the wallet with the user's password.
 *
 * The idea: Settld stores an encrypted bundle that won't open without the password. The
 * password is never sent to the server and the wallet is only decrypted on the device, so
 * signing in with a username and password feels like any other app while the keys stay the
 * user's. The server couldn't spend their money even if it wanted to.
 *
 * Uses WebCrypto only: PBKDF2 to stretch the password and AES-GCM to encrypt.
 */

/**
 * How many rounds we put the password through before using it as a key.
 *
 * The higher it is, the more expensive brute-forcing passwords becomes — and the longer
 * sign-in takes on an old phone. 300,000 is the balance: still costly to attack without
 * making the user wait.
 */
const ITERATIONS = 300_000
const SALT_BYTES = 16
const IV_BYTES = 12

export interface EncryptedVault {
  /** The encrypted wallet, in base64. */
  cipher: string
  /** Per-user salt: stops two identical passwords producing the same key. */
  salt: string
  /** Initialisation vector, different on every encryption. */
  iv: string
  iterations: number
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), char => char.charCodeAt(0))

async function deriveKey (password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/** Encrypts the wallet phrase so it can be stored on the server without exposing it. */
export async function encryptSeed (seedPhrase: string, password: string): Promise<EncryptedVault> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt, ITERATIONS)

  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(seedPhrase)
  )

  return {
    cipher: toBase64(new Uint8Array(cipher)),
    salt: toBase64(salt),
    iv: toBase64(iv),
    iterations: ITERATIONS
  }
}

export class WrongPasswordError extends Error {
  constructor () {
    super('Wrong password')
    this.name = 'WrongPasswordError'
  }
}

/**
 * Opens the encrypted bundle.
 *
 * AES-GCM comes with built-in verification: if the password is wrong, decryption fails
 * instead of returning garbage. That's why a wrong password detects itself.
 */
export async function decryptSeed (vault: EncryptedVault, password: string): Promise<string> {
  const key = await deriveKey(password, fromBase64(vault.salt), vault.iterations)

  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(vault.iv) as BufferSource },
      key,
      fromBase64(vault.cipher) as BufferSource
    )

    return new TextDecoder().decode(plain)
  } catch {
    throw new WrongPasswordError()
  }
}
