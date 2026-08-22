/**
 * The dashboard's arithmetic.
 *
 * The home screen is the only place in Settld that looks at every group at once: what
 * you're owed in total, what you owe in total, what happened lately and which group
 * still needs you. All of that is derived here, as pure functions over the data we
 * already fetch, so the screen itself only has to lay it out.
 *
 * Everything stays in cents and never touches the network.
 */

import { computeNetBalances, settlementPlan, splitEqually } from './balances'
import { formatMoney } from '@/lib/wdk/money'
import type { Expense, Group, Settlement, User } from './types'

/** The shape `GET /api/groups/:id` returns. Declared here so this file owes nothing to the store. */
export interface GroupDetailLike {
  group: Group
  members: User[]
  expenses: Expense[]
  settlements: Settlement[]
}

export interface GroupCard {
  group: Group
  /** Your balance in this group: positive if you're owed, negative if you owe. */
  netCents: number
  totalCents: number
  expenseCount: number
  memberCount: number
  /** How many people in the group are still short. */
  unpaidCount: number
}

export type ActivityKind = 'expense' | 'sent' | 'received' | 'other'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  /** Already written out for the reader, amount included. */
  title: string
  groupId: string
  groupName: string
  status: Settlement['status'] | null
  /** Only a settlement has one, and only once it is on chain. */
  txHash: string | null
  at: string
}

export type MemberStatus = 'paid' | 'settled' | 'owes'

export interface MemberShare {
  user: User
  shareCents: number
  status: MemberStatus
}

/** The one group the dashboard puts under the spotlight. */
export interface FocusGroup {
  group: Group
  totalCents: number
  netCents: number
  /** How much of the total you put in yourself. */
  paidByYouCents: number
  members: MemberShare[]
}

export interface MonthStats {
  expenses: number
  movedCents: number
  settled: number
}

export interface Dashboard {
  owedToYouCents: number
  youOweCents: number
  /** Distinct people who still owe you something, anywhere. */
  peopleOwingYou: number
  /** Transfers you still have to make, anywhere. */
  pendingPayments: number
  groups: GroupCard[]
  activity: ActivityItem[]
  focus: FocusGroup | null
  month: MonthStats
}

const ACTIVITY_LIMIT = 5

const firstName = (name: string) => name.split(' ')[0]

const byNewestFirst = (a: { at: string }, b: { at: string }) => b.at.localeCompare(a.at)

/**
 * Turns a group's expenses into what each member put in and where they stand.
 * Somebody who paid for something and isn't short is "paid"; somebody who never paid but
 * is square is "settled"; anybody below zero "owes".
 */
export function memberShares (detail: GroupDetailLike): MemberShare[] {
  const balances = computeNetBalances(detail.expenses, detail.settlements)

  return detail.members.map(user => {
    let shareCents = 0
    let paidSomething = false

    for (const expense of detail.expenses) {
      if (expense.paidBy === user.id) paidSomething = true

      const index = expense.splitBetween.indexOf(user.id)
      if (index === -1) continue

      shareCents += splitEqually(expense.amountCents, expense.splitBetween.length)[index]
    }

    const net = balances[user.id] ?? 0
    const status: MemberStatus = net < 0 ? 'owes' : paidSomething ? 'paid' : 'settled'

    return { user, shareCents, status }
  })
}

/** Everything that has happened in a group, newest first, written out in plain words. */
export function groupActivity (detail: GroupDetailLike, userId: string): ActivityItem[] {
  const nameOf = (id: string) => {
    const member = detail.members.find(m => m.id === id)
    return member ? firstName(member.name) : 'Someone'
  }

  const expenses: ActivityItem[] = detail.expenses.map(expense => ({
    id: expense.id,
    kind: 'expense',
    title: expense.paidBy === userId
      ? `You added ${expense.description}`
      : `${nameOf(expense.paidBy)} added ${expense.description}`,
    groupId: detail.group.id,
    groupName: detail.group.name,
    status: null,
    txHash: null,
    at: expense.createdAt
  }))

  const settlements: ActivityItem[] = detail.settlements.map(settlement => {
    const money = formatMoney(settlement.amountCents)

    const [kind, title]: [ActivityKind, string] =
      settlement.from === userId
        ? ['sent', `You paid ${nameOf(settlement.to)} ${money}`]
        : settlement.to === userId
          ? ['received', `${nameOf(settlement.from)} paid you ${money}`]
          : ['other', `${nameOf(settlement.from)} paid ${nameOf(settlement.to)} ${money}`]

    return {
      id: settlement.id,
      kind,
      title,
      groupId: detail.group.id,
      groupName: detail.group.name,
      status: settlement.status,
      txHash: settlement.txHash ?? null,
      at: settlement.createdAt
    }
  })

  return [...expenses, ...settlements].sort(byNewestFirst)
}

/** Every event in every group, newest first. The activity screen shows all of it. */
export function allActivity (details: GroupDetailLike[], userId: string): ActivityItem[] {
  return details.flatMap(detail => groupActivity(detail, userId)).sort(byNewestFirst)
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
 * Everything the home screen shows, from the groups we already loaded.
 *
 * `now` is a parameter rather than a `new Date()` inside so the month stats are testable
 * and don't depend on the day the tests run.
 */
export function buildDashboard (details: GroupDetailLike[], userId: string, now: Date = new Date()): Dashboard {
  const groups: GroupCard[] = []
  const activity: ActivityItem[] = []
  const debtors = new Set<string>()

  let owedToYouCents = 0
  let youOweCents = 0
  let pendingPayments = 0
  const month: MonthStats = { expenses: 0, movedCents: 0, settled: 0 }

  for (const detail of details) {
    const { group, expenses, settlements } = detail
    const plan = settlementPlan(expenses, settlements, userId)
    const balances = computeNetBalances(expenses, settlements)

    if (plan.netCents > 0) owedToYouCents += plan.netCents
    if (plan.netCents < 0) youOweCents += -plan.netCents

    pendingPayments += plan.owes.length
    for (const payment of plan.owed) debtors.add(payment.from)

    groups.push({
      group,
      netCents: plan.netCents,
      totalCents: expenses.reduce((sum, expense) => sum + expense.amountCents, 0),
      expenseCount: expenses.length,
      memberCount: group.memberIds.length,
      unpaidCount: Object.values(balances).filter(value => value < 0).length
    })

    activity.push(...groupActivity(detail, userId))

    month.expenses += expenses.filter(expense => sameMonth(expense.createdAt, now)).length

    for (const settlement of settlements) {
      if (settlement.status !== 'confirmed' || !sameMonth(settlement.createdAt, now)) continue
      month.movedCents += settlement.amountCents
      month.settled += 1
    }
  }

  return {
    owedToYouCents,
    youOweCents,
    peopleOwingYou: debtors.size,
    pendingPayments,
    // Whatever is still open comes first; among settled groups, the busiest.
    groups: groups.sort((a, b) =>
      Math.abs(b.netCents) - Math.abs(a.netCents) || b.expenseCount - a.expenseCount
    ),
    activity: activity.sort(byNewestFirst).slice(0, ACTIVITY_LIMIT),
    focus: pickFocus(details, groups, userId),
    month
  }
}

/**
 * The group that gets the big panel: the one where you have the most money at stake, and
 * failing that the one with the most going on. Showing nothing there would waste the best
 * spot on the screen.
 */
function pickFocus (details: GroupDetailLike[], cards: GroupCard[], userId: string): FocusGroup | null {
  const best = cards[0]
  if (!best) return null

  const detail = details.find(d => d.group.id === best.group.id)
  if (!detail) return null

  return {
    group: best.group,
    totalCents: best.totalCents,
    netCents: best.netCents,
    paidByYouCents: detail.expenses
      .filter(expense => expense.paidBy === userId)
      .reduce((sum, expense) => sum + expense.amountCents, 0),
    members: memberShares(detail)
  }
}

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
