/**
 * Settld's data model.
 *
 * Every amount lives in "cents" (integers) so splitting an expense never drags floating
 * point errors along. USD₮ has 6 decimals on-chain, so converting to token units is
 * `cents * 10_000`.
 */

export const CENTS_PER_UNIT = 100
export const TOKEN_UNITS_PER_CENT = 10_000

/**
 * The wallet encrypted with the user's password.
 *
 * It is the only thing Settld keeps of the keys, and without the password — which never
 * reaches the server — it cannot be opened. That's why it never travels alongside the
 * rest of the user: it is requested separately, only at sign-in.
 */
export interface EncryptedVault {
  cipher: string
  salt: string
  iv: string
  iterations: number
}

export interface User {
  id: string
  name: string
  username: string
  /** The WDK smart account address. We derive it in the browser when the account is created. */
  walletAddress: string
}

/** The user as stored. The vault never leaves here except at sign-in. */
export interface StoredUser extends User {
  vault?: EncryptedVault
}

/**
 * A settld: one thing somebody paid for, split between some people.
 *
 * There are no groups. A dinner is not a folder you file expenses into, it's the expense
 * itself — so this is the whole unit. Whoever paid owns it, and is the only one who can
 * change or remove it.
 */
export interface Settld {
  id: string
  description: string
  /** Total amount in cents. */
  amountCents: number
  paidBy: string
  splitBetween: string[]
  createdAt: string
}

export type SettlementStatus = 'pending' | 'confirmed' | 'failed'

export interface Settlement {
  id: string
  from: string
  to: string
  amountCents: number
  status: SettlementStatus
  /** The UserOperation hash WDK returns. */
  userOpHash?: string
  /** The real transaction hash on the blockchain, resolved from the EntryPoint event. */
  txHash?: string
  createdAt: string
}

/** What one person owes another, once everything between them has been netted out. */
export interface Debt {
  /** The other person. */
  userId: string
  /** Positive: they owe you. Negative: you owe them. Never zero — settled pairs are dropped. */
  netCents: number
}
