/**
 * Validation of everything that comes in through the API. Nothing from the client is
 * touched without passing through here: a negative amount or a malformed address has
 * to die at the edge, not three layers in.
 */

export class ValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function requireString (value: unknown, field: string, { max = 120 } = {}): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is missing`)
  }
  if (value.length > max) {
    throw new ValidationError(`${field} is too long`)
  }
  return value.trim()
}

export function requirePositiveCents (value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} has to be a valid amount greater than zero`)
  }
  return value
}

export function requireStringArray (value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some(v => typeof v !== 'string')) {
    throw new ValidationError(`${field} has to have at least one entry`)
  }
  return value as string[]
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function requireWalletAddress (value: unknown, field = 'the address'): string {
  const address = requireString(value, field, { max: 42 })

  if (!EVM_ADDRESS.test(address)) throw new ValidationError(`${field} is not in a valid format`)
  if (address.toLowerCase() === ZERO_ADDRESS) throw new ValidationError(`${field} cannot be the zero address`)

  return address
}

/**
 * The encrypted bundle the browser sends.
 *
 * The server can neither open it nor verify what's inside, so all it can do is make
 * sure it has the right shape and a reasonable size.
 */
export function requireVault (value: unknown) {
  if (typeof value !== 'object' || value === null) throw new ValidationError('The encrypted wallet is missing')

  const vault = value as Record<string, unknown>
  const base64 = /^[A-Za-z0-9+/]+={0,2}$/

  for (const field of ['cipher', 'salt', 'iv'] as const) {
    const part = vault[field]
    if (typeof part !== 'string' || part.length === 0 || part.length > 4096 || !base64.test(part)) {
      throw new ValidationError('The encrypted wallet arrived damaged')
    }
  }

  // Fewer rounds than we use would mean a password that is easier to crack.
  if (typeof vault.iterations !== 'number' || vault.iterations < 100_000 || vault.iterations > 5_000_000) {
    throw new ValidationError('The encrypted wallet arrived damaged')
  }

  return {
    cipher: vault.cipher as string,
    salt: vault.salt as string,
    iv: vault.iv as string,
    iterations: vault.iterations
  }
}

const USERNAME = /^[a-z0-9_]{3,20}$/

export function requireUsername (value: unknown): string {
  const username = requireString(value, 'the username', { max: 21 }).replace(/^@/, '').toLowerCase()

  if (!USERNAME.test(username)) {
    throw new ValidationError('A username has to be 3 to 20 characters: letters, numbers or underscore')
  }
  return username
}
