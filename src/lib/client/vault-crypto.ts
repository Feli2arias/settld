/**
 * Cifrado de la wallet con la contraseña del usuario.
 *
 * La idea: Settld guarda un bulto cifrado que sin la contraseña no abre. La contraseña
 * nunca se manda al servidor y la wallet se descifra recién en el dispositivo, así que
 * entrar con usuario y contraseña se siente como cualquier app, pero las claves siguen
 * siendo del usuario. El servidor no puede gastar su plata ni aunque quiera.
 *
 * Usa sólo WebCrypto: PBKDF2 para estirar la contraseña y AES-GCM para cifrar.
 */

/**
 * Cuántas vueltas le damos a la contraseña antes de usarla como clave.
 *
 * Cuanto más alto, más caro le sale a alguien probar contraseñas a lo bruto — y más
 * tarda el login en un celular viejo. 300.000 es el equilibrio: sigue siendo caro de
 * atacar y no hace esperar al usuario.
 */
const ITERATIONS = 300_000
const SALT_BYTES = 16
const IV_BYTES = 12

export interface EncryptedVault {
  /** La wallet cifrada, en base64. */
  cipher: string
  /** Sal única por usuario: evita que dos contraseñas iguales den la misma clave. */
  salt: string
  /** Vector de inicialización, distinto en cada cifrado. */
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

/** Cifra la frase de la wallet para poder guardarla en el servidor sin exponerla. */
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
    super('Contraseña incorrecta')
    this.name = 'WrongPasswordError'
  }
}

/**
 * Abre el bulto cifrado.
 *
 * AES-GCM viene con verificación incorporada: si la contraseña está mal, el descifrado
 * falla en vez de devolver basura. Por eso una contraseña equivocada se detecta sola.
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
