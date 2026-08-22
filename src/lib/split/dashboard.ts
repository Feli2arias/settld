/**
 * What the screens show, derived from the ledger.
 *
 * The dashboard, the activity screen and every list of settlds are built from the same
 * two arrays the server hands over. Everything here is a pure function over them, which
 * is why the arithmetic can be tested without a browser or a network.
 */

import { balanceBetween, debtsOf, standingOf } from './balances'
import { formatMoney } from '@/lib/wdk/money'
import type { Debt, Settld, Settlement, User } from './types'

/** What `GET /api/ledger` returns. Declared here so this file owes nothing to the store. */
export interface LedgerLike {
  settlds: Settld[]
  settlements: Settlement[]
  people: User[]
}

export type ActivityKind = 'settld' | 'sent' | 'received'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  /** Already written out for the reader, amount included. */
  title: string
  /** The settld or the person this row is about, for linking. */
  settldId: string | null
  personId: string | null
  status: Settlement['status'] | null
  /** Only a settlement has one, and only once it is on chain. */
  txHash: string | null
  at: string
}

export interface PersonDebt extends Debt {
  person: User
}

export interface MonthStats {
  settlds: number
  movedCents: number
  settled: number
}

export interface Dashboard {
  owedToYouCents: number
  youOweCents: number
  /** Who owes you, biggest first. */
  owed: PersonDebt[]
  /** Who you owe, biggest first. */
  owing: PersonDebt[]
  /** Your settlds, newest first. */
  settlds: Settld[]
  activity: ActivityItem[]
  month: MonthStats
}

const ACTIVITY_LIMIT = 5

const firstName = (name: string) => name.split(' ')[0]

const byNewestFirst = (a: { at: string }, b: { at: string }) => b.at.localeCompare(a.at)

const nameIn = (people: User[], id: string) => {
  const person = people.find(p => p.id === id)
  return person ? firstName(person.name) : 'Someone'
}

const personIn = (people: User[], id: string): User =>
  people.find(p => p.id === id) ?? { id, name: 'Someone', username: 'unknown', walletAddress: '' }

/** Every event, newest first, written out in plain words. */
export function allActivity (ledger: LedgerLike, userId: string): ActivityItem[] {
  const { people } = ledger

  const settlds: ActivityItem[] = ledger.settlds.map(settld => ({
    id: settld.id,
    kind: 'settld',
    title: settld.paidBy === userId
      ? `You added ${settld.description}`
      : `${nameIn(people, settld.paidBy)} added ${settld.description}`,
    settldId: settld.id,
    personId: settld.paidBy === userId ? null : settld.paidBy,
    status: null,
    txHash: null,
    at: settld.createdAt
  }))

  const payments: ActivityItem[] = ledger.settlements.map(settlement => {
    const money = formatMoney(settlement.amountCents)
    const outgoing = settlement.from === userId
    const other = outgoing ? settlement.to : settlement.from

    return {
      id: settlement.id,
      kind: outgoing ? 'sent' : 'received',
      title: outgoing
        ? `You paid ${nameIn(people, settlement.to)} ${money}`
        : `${nameIn(people, settlement.from)} paid you ${money}`,
      settldId: null,
      personId: other,
      status: settlement.status,
      txHash: settlement.txHash ?? null,
      at: settlement.createdAt
    }
  })

  return [...settlds, ...payments].sort(byNewestFirst)
}

export interface ActivityDay {
  label: string
  items: ActivityItem[]
}

/**
 * Splits a history into days, because a flat list of forty rows is a wall. The order is
 * preserved, so the days come out newest first just like the items.
 */
export function groupByDay (items: ActivityItem[], now: Date = new Date()): ActivityDay[] {
  const days: ActivityDay[] = []

  for (const item of items) {
    const label = dayLabel(item.at, now)
    const last = days[days.length - 1]

    if (last?.label === label) last.items.push(item)
    else days.push({ label, items: [item] })
  }

  return days
}

const sameMonth = (iso: string, now: Date) => {
  const date = new Date(iso)
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

/**
 * Everything the home screen shows.
 *
 * `now` is a parameter rather than a `new Date()` inside so the month stats are testable
 * and don't depend on the day the tests run.
 */
export function buildDashboard (ledger: LedgerLike, userId: string, now: Date = new Date()): Dashboard {
  const standing = standingOf(ledger.settlds, ledger.settlements, userId)

  const withPerson = (debt: Debt): PersonDebt => ({ ...debt, person: personIn(ledger.people, debt.userId) })

  const month: MonthStats = {
    settlds: ledger.settlds.filter(settld => sameMonth(settld.createdAt, now)).length,
    movedCents: 0,
    settled: 0
  }

  for (const settlement of ledger.settlements) {
    if (settlement.status !== 'confirmed' || !sameMonth(settlement.createdAt, now)) continue
    month.movedCents += settlement.amountCents
    month.settled += 1
  }

  return {
    owedToYouCents: standing.owedToYouCents,
    youOweCents: standing.youOweCents,
    owed: standing.debts.filter(d => d.netCents > 0).map(withPerson),
    owing: standing.debts.filter(d => d.netCents < 0).map(withPerson),
    settlds: [...ledger.settlds].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    activity: allActivity(ledger, userId).slice(0, ACTIVITY_LIMIT),
    month
  }
}

/** What one person owes you, or you owe them, right now. Feeds the settle-up screen. */
export function debtWith (ledger: LedgerLike, userId: string, otherId: string): PersonDebt {
  return {
    userId: otherId,
    netCents: balanceBetween(ledger.settlds, ledger.settlements, userId, otherId),
    person: personIn(ledger.people, otherId)
  }
}

/** Everyone with something open, in either direction. */
export const openDebts = (ledger: LedgerLike, userId: string): PersonDebt[] =>
  debtsOf(ledger.settlds, ledger.settlements, userId)
    .map(debt => ({ ...debt, person: personIn(ledger.people, debt.userId) }))

/**
 * The day something happened, the way a person would say it: "Today", "Yesterday",
 * "August 12". Nobody wants to read an ISO timestamp.
 */
export function dayLabel (iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000
  )

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric'
  })
}

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** Day and time together, for the short list on the dashboard. */
export function formatWhen (iso: string, now: Date = new Date()): string {
  const day = dayLabel(iso, now)
  return day === 'Today' || day === 'Yesterday' ? `${day} ${timeLabel(iso)}` : day
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
