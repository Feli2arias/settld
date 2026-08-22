/**
 * Settld's storage: users, groups, expenses and settlements.
 *
 * No seeds or keys live here. The only thing we know about a wallet is its public address.
 *
 * Where the data is stored is decided by `backend.ts` based on the environment; this file
 * only describes the operations.
 */

import { randomUUID } from 'node:crypto'
import type { EncryptedVault, Expense, Group, Settlement, SettlementStatus, StoredUser, User } from '@/lib/split/types'
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

// --- Usuarios ---

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

// --- Grupos ---

export function createGroup (input: { name: string, memberIds: string[] }): Promise<Group> {
  return mutate(db => {
    const group: Group = {
      id: randomUUID(),
      name: input.name.trim(),
      memberIds: [...new Set(input.memberIds)],
      createdAt: now()
    }
    db.groups.push(group)
    return group
  })
}

export async function listGroupsForUser (userId: string): Promise<Group[]> {
  return (await read()).groups.filter(g => g.memberIds.includes(userId))
}

export async function findGroup (groupId: string): Promise<Group | null> {
  return (await read()).groups.find(g => g.id === groupId) ?? null
}

/** Everything needed to paint a group's screen, in a single read. */
export interface GroupDetail {
  group: Group
  members: User[]
  expenses: Expense[]
  settlements: Settlement[]
}

export async function getGroupDetail (groupId: string): Promise<GroupDetail | null> {
  const db = await read()
  const group = db.groups.find(g => g.id === groupId)
  if (!group) return null

  return {
    group,
    members: db.users.filter(u => group.memberIds.includes(u.id)).map(withoutVault),
    expenses: db.expenses.filter(e => e.groupId === groupId),
    settlements: db.settlements.filter(s => s.groupId === groupId)
  }
}

// --- Gastos ---

export function createExpense (input: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  return mutate(db => {
    const expense: Expense = { ...input, id: randomUUID(), createdAt: now() }
    db.expenses.push(expense)
    return expense
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
