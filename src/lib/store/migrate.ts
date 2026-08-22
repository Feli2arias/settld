/**
 * Bringing forward the data from when Settld had groups.
 *
 * A group was a folder you filed expenses into. Now the expense is the whole unit, so the
 * folders are dropped and what was inside them stands on its own: same amount, same payer,
 * same people. Payments keep working because they were always between two people — the
 * group they were filed under never affected who owed what.
 *
 * This runs on every read, so a database written by the old app opens in the new one
 * without a migration step anybody has to remember to run.
 */

import type { Settld, Settlement } from '@/lib/split/types'

/** What the store looked like before. Only the parts we still need. */
interface LegacyShape {
  settlds?: unknown
  expenses?: unknown
  groups?: unknown
  settlements?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/** Drops `groupId` and anything else that is no longer part of a settld. */
function asSettld (value: unknown): Settld | null {
  if (!isRecord(value)) return null

  const { id, description, amountCents, paidBy, splitBetween, createdAt } = value

  if (typeof id !== 'string' || typeof paidBy !== 'string') return null
  if (typeof amountCents !== 'number' || !Array.isArray(splitBetween)) return null

  return {
    id,
    description: typeof description === 'string' ? description : 'Expense',
    amountCents,
    paidBy,
    splitBetween: splitBetween.filter((entry): entry is string => typeof entry === 'string'),
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(0).toISOString()
  }
}

function asSettlement (value: unknown): Settlement | null {
  if (!isRecord(value)) return null

  const { id, from, to, amountCents, status, userOpHash, txHash, createdAt } = value

  if (typeof id !== 'string' || typeof from !== 'string' || typeof to !== 'string') return null
  if (typeof amountCents !== 'number') return null

  return {
    id,
    from,
    to,
    amountCents,
    status: status === 'confirmed' || status === 'failed' ? status : 'pending',
    ...(typeof userOpHash === 'string' ? { userOpHash } : {}),
    ...(typeof txHash === 'string' ? { txHash } : {}),
    createdAt: typeof createdAt === 'string' ? createdAt : new Date(0).toISOString()
  }
}

/**
 * Reads settlds out of a database of either shape.
 * Anything too damaged to make sense of is dropped rather than guessed at — a settld with
 * no payer or no amount cannot be turned into a debt.
 */
export function migrateSettlds (db: LegacyShape): Settld[] {
  const source = Array.isArray(db.settlds) ? db.settlds : Array.isArray(db.expenses) ? db.expenses : []

  return source.map(asSettld).filter((settld): settld is Settld => settld !== null)
}

export function migrateSettlements (db: LegacyShape): Settlement[] {
  const source = Array.isArray(db.settlements) ? db.settlements : []

  return source.map(asSettlement).filter((settlement): settlement is Settlement => settlement !== null)
}

/** True when the stored database still has the old shape, and a rewrite is worth doing. */
export const needsMigration = (db: LegacyShape): boolean =>
  Array.isArray(db.expenses) || Array.isArray(db.groups)
