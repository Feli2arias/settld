/**
 * Keeps the wallet seed on the user's device and nowhere else.
 *
 * ⚠️ Hackathon scope: the seed is stored in localStorage in plain text. That's acceptable
 * here because we run on Sepolia with test USD₮, which is worth nothing. For real money
 * this has to go through a user passphrase and WebCrypto encryption before touching disk.
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

/** Signs out and wipes the seed. Without a backup the wallet is lost: hence the warning. */
export function forgetEverything (): void {
  if (!isBrowser()) return
  localStorage.removeItem(SEED_KEY)
  localStorage.removeItem(SESSION_KEY)
}
