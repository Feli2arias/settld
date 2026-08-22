/**
 * Settld's storage: users, settlds and settlements.
 *
 * No seeds or keys live here. The only thing we know about a wallet is its public address.
 *
 * Where the data is stored is decided by `backend.ts` based on the environment; this file
 * only describes the operations.
 */

import { randomUUID } from 'node:crypto'
import type { EncryptedVault, Settld, Settlement, SettlementStatus, StoredUser, User } from '@/lib/split/types'
import { settldsOf } from '@/lib/split/balances'
import { type Database, loadDatabase, saveDatabase } from './backend'

/** Serializes writes so two simultaneous requests do not clobber each other. */
let queue: Promise<unknown> = Promise.resolve()

const read = loadDatabase

/** Applies a mutation to the state and returns whatever the mutation produced. */
function mutate<T> (fn: (db: Database) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const db = await loadDatabase()
    const result = await fn(db)
    await saveDatabase(db)
    return result
  })

  queue = next.catch(() => {}) // a failure must not jam the queue
  return next
}

const now = () => new Date().toISOString()
const normalizeUsername = (username: string) => username.trim().replace(/^@/, '').toLowerCase()

// --- Users ---

/**
 * Strips the vault before returning a user.
 *
 * The vault is encrypted, but we still don't hand it around: the less it circulates, the
 * fewer chances someone walks off with it to try passwords against at their leisure. It
 * is served only through `findVaultByUsername`, at sign-in.
 */
const withoutVault = ({ vault: _vault, ...user }: StoredUser): User => user

export async function listUsers (): Promise<User[]> {
  return (await read()).users.map(withoutVault)
}

export async function findUserByUsername (username: string): Promise<User | null> {
  const target = normalizeUsername(username)
  const user = (await read()).users.find(u => u.username === target)
  return user ? withoutVault(user) : null
}

/** An account's encrypted bundle. Without the user's password it is worthless. */
export async function findVaultByUsername (username: string): Promise<EncryptedVault | null> {
  const target = normalizeUsername(username)
  return (await read()).users.find(u => u.username === target)?.vault ?? null
}

/**
 * Looks up by wallet address. This is what makes signing back into an account possible:
 * the recovery phrase yields the address, and the address yields the user. We compare in
 * lowercase because the checksum on an EVM address is purely cosmetic.
 */
export async function findUserByWalletAddress (address: string): Promise<User | null> {
  const target = address.toLowerCase()
  const user = (await read()).users.find(u => u.walletAddress.toLowerCase() === target)
  return user ? withoutVault(user) : null
}

export async function findUserById (id: string): Promise<User | null> {
  const user = (await read()).users.find(u => u.id === id)
  return user ? withoutVault(user) : null
}

export class UsernameTakenError extends Error {
  constructor (username: string) {
    super(`The username @${username} is already taken`)
    this.name = 'UsernameTakenError'
  }
}

export function createUser (input: {
  name: string
  username: string
  walletAddress: string
  vault?: EncryptedVault
}): Promise<User> {
  const username = normalizeUsername(input.username)

  return mutate(db => {
    if (db.users.some(u => u.username === username)) throw new UsernameTakenError(username)

    const user: StoredUser = {
      id: randomUUID(),
      name: input.name.trim(),
      username,
      walletAddress: input.walletAddress,
      vault: input.vault
    }
    db.users.push(user)
    return withoutVault(user)
  })
}

// --- Settlds ---

export class NotYoursError extends Error {
  constructor () {
    super('Only whoever paid can change this')
    this.name = 'NotYoursError'
  }
}

export class NotFoundError extends Error {
  constructor (what: string) {
    super(`We couldn't find that ${what}`)
    this.name = 'NotFoundError'
  }
}

/** Everything one person can see, in a single read. */
export interface Ledger {
  settlds: Settld[]
  settlements: Settlement[]
  /** Everyone appearing in any of it, so the screens can put names to the ids. */
  people: User[]
}

/**
 * One person's whole picture.
 *
 * A settld is visible to whoever paid for it and to whoever it was split between, and to
 * nobody else. Settlements are filtered the same way: a payment between two other people
 * is none of your business, even if you share a settld with one of them.
 */
export async function getLedger (userId: string): Promise<Ledger> {
  const db = await read()

  const settlds = settldsOf(db.settlds, userId)
  const settlements = db.settlements.filter(s => s.from === userId || s.to === userId)

  const ids = new Set<string>([userId])
  for (const settld of settlds) {
    ids.add(settld.paidBy)
    for (const participant of settld.splitBetween) ids.add(participant)
  }
  for (const settlement of settlements) {
    ids.add(settlement.from)
    ids.add(settlement.to)
  }

  return {
    settlds,
    settlements,
    people: db.users.filter(u => ids.has(u.id)).map(withoutVault)
  }
}

export function createSettld (input: Omit<Settld, 'id' | 'createdAt'>): Promise<Settld> {
  return mutate(db => {
    const settld: Settld = { ...input, id: randomUUID(), createdAt: now() }
    db.settlds.push(settld)
    return settld
  })
}

export async function findSettld (id: string): Promise<Settld | null> {
  return (await read()).settlds.find(s => s.id === id) ?? null
}

/**
 * Changes a settld. Only whoever paid for it may.
 *
 * The date is left alone on purpose: editing a typo in the amount shouldn't move a dinner
 * from last week to the top of today's activity.
 */
export function updateSettld (
  id: string,
  userId: string,
  patch: Partial<Pick<Settld, 'description' | 'amountCents' | 'splitBetween'>>
): Promise<Settld> {
  return mutate(db => {
    const index = db.settlds.findIndex(s => s.id === id)
    if (index === -1) throw new NotFoundError('settld')
    if (db.settlds[index].paidBy !== userId) throw new NotYoursError()

    const updated: Settld = { ...db.settlds[index], ...patch }
    db.settlds[index] = updated
    return updated
  })
}

/**
 * Removes a settld. Only whoever paid for it may.
 *
 * Payments are deliberately left where they are. Money that moved on a public blockchain
 * did move; deleting the reason for it doesn't undo it. What the arithmetic does with that
 * is show the payer owing it back, which is the truth.
 */
export function deleteSettld (id: string, userId: string): Promise<void> {
  return mutate(db => {
    const index = db.settlds.findIndex(s => s.id === id)
    if (index === -1) throw new NotFoundError('settld')
    if (db.settlds[index].paidBy !== userId) throw new NotYoursError()

    db.settlds.splice(index, 1)
  })
}

// --- Settlements ---

export function createSettlement (input: Omit<Settlement, 'id' | 'createdAt' | 'status'>): Promise<Settlement> {
  return mutate(db => {
    const settlement: Settlement = { ...input, id: randomUUID(), status: 'pending', createdAt: now() }
    db.settlements.push(settlement)
    return settlement
  })
}

export function updateSettlement (
  id: string,
  patch: { status: SettlementStatus, txHash?: string }
): Promise<Settlement | null> {
  return mutate(db => {
    const index = db.settlements.findIndex(s => s.id === id)
    if (index === -1) return null

    const updated: Settlement = { ...db.settlements[index], ...patch }
    db.settlements[index] = updated
    return updated
  })
}
