/**
 * Guarda la seed de la wallet en el dispositivo del usuario y en ningún otro lado.
 *
 * ⚠️ Alcance del hackathon: la seed se guarda en localStorage en texto plano.
 * Es aceptable acá porque corremos sobre Sepolia con USD₮ de prueba, que no vale
 * nada. Para plata real esto tiene que pasar por una passphrase del usuario y
 * cifrado con WebCrypto antes de tocar el disco.
 */

const SEED_KEY = 'split.seed'
const SESSION_KEY = 'split.session'

export interface StoredSession {
  userId: string
  username: string
  name: string
  walletAddress: string
}

const isBrowser = () => typeof window !== 'undefined'

export function saveSeed (seedPhrase: string): void {
  if (!isBrowser()) return
  localStorage.setItem(SEED_KEY, seedPhrase)
}

export function readSeed (): string | null {
  if (!isBrowser()) return null
  return localStorage.getItem(SEED_KEY)
}

export function saveSession (session: StoredSession): void {
  if (!isBrowser()) return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function readSession (): StoredSession | null {
  if (!isBrowser()) return null

  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

/** Cierra sesión y borra la seed. Sin backup, la wallet se pierde: por eso avisamos. */
export function forgetEverything (): void {
  if (!isBrowser()) return
  localStorage.removeItem(SEED_KEY)
  localStorage.removeItem(SESSION_KEY)
}
