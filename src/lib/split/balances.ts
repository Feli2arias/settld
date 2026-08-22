/**
 * Settld's brain: from a pile of settlds, works out who owes whom.
 *
 * Everything here is a pure function over integers. No blockchain, no network, no state:
 * Settld decides WHO pays WHOM, and only then does WDK execute those payments.
 *
 * The arithmetic is **pairwise**, and that is a decision worth defending. When there were
 * groups, everyone in a group saw the same expenses, so a global "who pays whom" could be
 * optimised across the whole group and everybody agreed on the answer. Without groups
 * there is no such shared set: somebody you split a dinner with is in other settlds you
 * cannot see. Netting globally would mean computing their balance from half the facts and
 * telling you to pay a third party on the strength of it — and they would see a different
 * number on their screen. So a debt only ever exists between two people, and both of them
 * can see every settld that produced it.
 */

import type { Debt, Settld, Settlement } from './types'

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

/** What each participant's share of one settld comes to, keyed by person. */
export function sharesOf (settld: Settld): Record<string, number> {
  const shares = splitEqually(settld.amountCents, settld.splitBetween.length)

  return Object.fromEntries(settld.splitBetween.map((userId, i) => [userId, shares[i]]))
}

/**
 * What one person owes another across everything between them, in cents.
 * Positive means `otherId` owes `userId`. Negative means the other way around.
 *
 * Only settlements confirmed on the blockchain count: while a transfer is pending or has
 * failed, the debt is still alive.
 */
export function balanceBetween (
  settlds: Settld[],
  settlements: Settlement[],
  userId: string,
  otherId: string
): number {
  let cents = 0

  for (const settld of settlds) {
    // A settld only says something about this pair if it involves both of them.
    const shares = sharesOf(settld)
    const theirs = shares[otherId] ?? 0
    const yours = shares[userId] ?? 0

    if (settld.paidBy === userId && theirs > 0 && otherId !== userId) cents += theirs
    if (settld.paidBy === otherId && yours > 0 && otherId !== userId) cents -= yours
  }

  for (const settlement of settlements) {
    if (settlement.status !== 'confirmed') continue

    if (settlement.from === otherId && settlement.to === userId) cents -= settlement.amountCents
    if (settlement.from === userId && settlement.to === otherId) cents += settlement.amountCents
  }

  return cents
}

/** Everyone this person shares a settld with, whoever paid. */
export function counterpartiesOf (settlds: Settld[], settlements: Settlement[], userId: string): string[] {
  const people = new Set<string>()

  for (const settld of settlds) {
    const involved = settld.splitBetween.includes(userId) || settld.paidBy === userId
    if (!involved) continue

    for (const participant of [...settld.splitBetween, settld.paidBy]) {
      if (participant !== userId) people.add(participant)
    }
  }

  for (const settlement of settlements) {
    if (settlement.from === userId) people.add(settlement.to)
    if (settlement.to === userId) people.add(settlement.from)
  }

  return [...people].sort()
}

/**
 * Every open debt this person has, in either direction, biggest first.
 * Anyone who is square with them is left out — there is nothing to say about them.
 */
export function debtsOf (settlds: Settld[], settlements: Settlement[], userId: string): Debt[] {
  return counterpartiesOf(settlds, settlements, userId)
    .map(otherId => ({ userId: otherId, netCents: balanceBetween(settlds, settlements, userId, otherId) }))
    .filter(debt => debt.netCents !== 0)
    .sort((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents) || a.userId.localeCompare(b.userId))
}

export interface Standing {
  /** Everything owed to you, added up. */
  owedToYouCents: number
  /** Everything you owe, added up, as a positive number. */
  youOweCents: number
  /** Open debts, biggest first, in both directions. */
  debts: Debt[]
  isSettled: boolean
}

/** Where this person stands with everybody. This is what feeds the dashboard. */
export function standingOf (settlds: Settld[], settlements: Settlement[], userId: string): Standing {
  const debts = debtsOf(settlds, settlements, userId)

  return {
    owedToYouCents: debts.filter(d => d.netCents > 0).reduce((sum, d) => sum + d.netCents, 0),
    youOweCents: debts.filter(d => d.netCents < 0).reduce((sum, d) => sum - d.netCents, 0),
    debts,
    isSettled: debts.length === 0
  }
}

/** Which settlds a person is part of at all — theirs to see, and nobody else's. */
export const settldsOf = (settlds: Settld[], userId: string): Settld[] =>
  settlds.filter(settld => settld.paidBy === userId || settld.splitBetween.includes(userId))

export type ParticipantStatus = 'paid' | 'settled' | 'owes'

export interface Participant {
  userId: string
  shareCents: number
  status: ParticipantStatus
}

/**
 * How one settld stands, person by person.
 *
 * "Settled" here means settled **with the payer**: whether somebody has cleared their
 * balance with the person who put the money down. It is not per-settld, because payments
 * are not per-settld — you pay a person, not an invoice.
 */
export function participantsOf (settld: Settld, settlements: Settlement[], allSettlds: Settld[]): Participant[] {
  const shares = sharesOf(settld)

  return settld.splitBetween.map(userId => {
    if (userId === settld.paidBy) {
      return { userId, shareCents: shares[userId] ?? 0, status: 'paid' as const }
    }

    const owed = balanceBetween(allSettlds, settlements, settld.paidBy, userId)

    return {
      userId,
      shareCents: shares[userId] ?? 0,
      status: owed > 0 ? ('owes' as const) : ('settled' as const)
    }
  })
}
