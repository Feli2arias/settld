/**
 * Settld's brain: from a group's expenses, works out who owes whom and what the smallest
 * set of transfers is that leaves everyone at zero.
 *
 * Everything here is a pure function over integers. No blockchain, no network, no state:
 * Settld decides WHO pays WHOM, and only then does WDK execute those payments.
 */

import type { Expense, Payment, Settlement } from './types'

/**
 * Splits an amount evenly without losing or inventing cents.
 * The remainder is handed out one cent at a time to the first participants.
 */
export function splitEqually (amountCents: number, participants: number): number[] {
  if (participants <= 0) return []

  const base = Math.floor(amountCents / participants)
  const remainder = amountCents - base * participants

  return Array.from({ length: participants }, (_, i) => base + (i < remainder ? 1 : 0))
}

/**
 * Each person's net balance, in cents.
 * Positive = they are owed money. Negative = they owe money. The total always sums to zero.
 *
 * Only settlements confirmed on the blockchain count: while a transfer is pending or has
 * failed, the debt is still alive.
 */
export function computeNetBalances (expenses: Expense[], settlements: Settlement[]): Record<string, number> {
  const balances: Record<string, number> = {}
  const add = (userId: string, cents: number) => {
    balances[userId] = (balances[userId] ?? 0) + cents
  }

  for (const expense of expenses) {
    add(expense.paidBy, expense.amountCents)

    const shares = splitEqually(expense.amountCents, expense.splitBetween.length)
    expense.splitBetween.forEach((userId, i) => add(userId, -shares[i]))
  }

  for (const settlement of settlements) {
    if (settlement.status !== 'confirmed') continue
    add(settlement.from, settlement.amountCents)
    add(settlement.to, -settlement.amountCents)
  }

  return balances
}

/**
 * Reduces the net balances to the minimum set of transfers that settles the group.
 *
 * It's the classic greedy "biggest debtor pays biggest creditor": it pairs the largest
 * debtor with the largest creditor until one of them hits zero. Every step clears at
 * least one person, so it never needs more than N-1 payments.
 */
export function whoOwesWho (expenses: Expense[], settlements: Settlement[]): Payment[] {
  const balances = computeNetBalances(expenses, settlements)

  // Sorted by amount — largest absolute value first — with ties broken alphabetically
  // by id, so the same group always produces the same plan.
  type Entry = [string, number]
  const entries = Object.entries(balances)

  const creditors = entries
    .filter(([, v]) => v > 0)
    .sort((a: Entry, b: Entry) => b[1] - a[1] || a[0].localeCompare(b[0]))

  const debtors = entries
    .filter(([, v]) => v < 0)
    .sort((a: Entry, b: Entry) => a[1] - b[1] || a[0].localeCompare(b[0]))

  const payments: Payment[] = []
  let c = 0
  let d = 0

  while (c < creditors.length && d < debtors.length) {
    const [creditorId, credit] = creditors[c]
    const [debtorId, debt] = debtors[d]

    const amountCents = Math.min(credit, -debt)
    if (amountCents > 0) payments.push({ from: debtorId, to: creditorId, amountCents })

    creditors[c] = [creditorId, credit - amountCents]
    debtors[d] = [debtorId, debt + amountCents]

    if (creditors[c][1] === 0) c++
    if (debtors[d][1] === 0) d++
  }

  return payments
}

export interface SettlementPlan {
  /** The user's balance in cents: positive if they are owed, negative if they owe. */
  netCents: number
  /** Transfers the user has to make from their own wallet. */
  owes: Payment[]
  /** Transfers other people have to make to them. */
  owed: Payment[]
  isSettled: boolean
}

/**
 * The plan seen through one person's eyes. This is what feeds the settle-up screen.
 *
 * Important: each user only ever confirms transfers leaving THEIR wallet. Settld never
 * executes a payment on somebody else's behalf.
 */
export function settlementPlan (expenses: Expense[], settlements: Settlement[], userId: string): SettlementPlan {
  const netCents = computeNetBalances(expenses, settlements)[userId] ?? 0
  const payments = whoOwesWho(expenses, settlements)

  return {
    netCents,
    owes: payments.filter(p => p.from === userId),
    owed: payments.filter(p => p.to === userId),
    isSettled: netCents === 0
  }
}
