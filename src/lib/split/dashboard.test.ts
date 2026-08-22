import { describe, expect, it } from 'vitest'
import type { Settld, Settlement, User } from './types'
import type { LedgerLike } from './dashboard'
import { allActivity, buildDashboard, dayLabel, debtWith, formatWhen, groupByDay } from './dashboard'

const user = (id: string, name: string): User => ({ id, name, username: id, walletAddress: `0x${id}` })

const felipe = user('felipe', 'Felipe Arias')
const daniel = user('daniel', 'Daniel Rossi')
const sofia = user('sofia', 'Sofía Núñez')

const settld = (over: Partial<Settld> & Pick<Settld, 'amountCents' | 'paidBy' | 'splitBetween'>): Settld => ({
  id: 's1',
  description: 'Dinner at Sikwa',
  createdAt: '2026-08-22T19:00:00Z',
  ...over
})

const paid = (over: Partial<Settlement> & Pick<Settlement, 'from' | 'to' | 'amountCents'>): Settlement => ({
  id: 'p1',
  status: 'confirmed',
  createdAt: '2026-08-22T20:00:00Z',
  ...over
})

/** Felipe paid for dinner, split three ways. */
const ledger = (over: Partial<LedgerLike> = {}): LedgerLike => ({
  settlds: [settld({ amountCents: 9000, paidBy: 'felipe', splitBetween: ['felipe', 'daniel', 'sofia'] })],
  settlements: [],
  people: [felipe, daniel, sofia],
  ...over
})

describe('allActivity', () => {
  it('writes each event from the reader point of view, newest first', () => {
    const l = ledger({ settlements: [paid({ from: 'daniel', to: 'felipe', amountCents: 3000 })] })

    expect(allActivity(l, 'felipe').map(i => i.title)).toEqual([
      'Daniel paid you $30.00',
      'You added Dinner at Sikwa'
    ])

    expect(allActivity(l, 'daniel').map(i => i.title)).toEqual([
      'You paid Felipe $30.00',
      'Felipe added Dinner at Sikwa'
    ])
  })

  it('carries the hash so a payment can link to its receipt', () => {
    const l = ledger({ settlements: [paid({ from: 'daniel', to: 'felipe', amountCents: 3000, txHash: '0xabc' })] })
    expect(allActivity(l, 'felipe')[0].txHash).toBe('0xabc')
  })

  it('points a settld row at the settld and a payment row at the person', () => {
    const l = ledger({ settlements: [paid({ from: 'daniel', to: 'felipe', amountCents: 3000 })] })
    const [payment, added] = allActivity(l, 'felipe')

    expect(payment.personId).toBe('daniel')
    expect(added.settldId).toBe('s1')
  })
})

describe('buildDashboard', () => {
  const now = new Date('2026-08-22T23:00:00Z')

  it('shows the two directions separately, never as one net figure', () => {
    // Dinner: Daniel and Sofía each owe Felipe 3000. Flat: Felipe owes Sofía 6000.
    // Sofía nets to 3000 against Felipe, so she moves from one column to the other.
    const flat = settld({ id: 's2', amountCents: 12000, paidBy: 'sofia', splitBetween: ['felipe', 'sofia'] })
    const board = buildDashboard(ledger({ settlds: [...ledger().settlds, flat] }), 'felipe', now)

    expect(board.owedToYouCents).toBe(3000)
    expect(board.youOweCents).toBe(3000)
    expect(board.owed.map(d => d.person.name)).toEqual(['Daniel Rossi'])
    expect(board.owing.map(d => d.person.name)).toEqual(['Sofía Núñez'])
  })

  it('drops somebody whose two directions cancel out exactly', () => {
    const flat = settld({ id: 's2', amountCents: 6000, paidBy: 'sofia', splitBetween: ['felipe', 'sofia'] })
    const board = buildDashboard(ledger({ settlds: [...ledger().settlds, flat] }), 'felipe', now)

    expect(board.owed.map(d => d.userId)).toEqual(['daniel'])
    expect(board.owing).toEqual([])
  })

  it('nets what runs both ways with the same person into a single row', () => {
    const taxi = settld({ id: 's2', amountCents: 4000, paidBy: 'daniel', splitBetween: ['felipe', 'daniel'] })
    const board = buildDashboard(ledger({ settlds: [...ledger().settlds, taxi] }), 'felipe', now)

    // Daniel owes 3000 for dinner, Felipe owes 2000 for the taxi: one row, 1000.
    expect(board.owed.filter(d => d.userId === 'daniel')).toEqual([
      expect.objectContaining({ userId: 'daniel', netCents: 1000 })
    ])
    expect(board.owing.map(d => d.userId)).not.toContain('daniel')
  })

  it('drops anybody who is square', () => {
    const board = buildDashboard(
      ledger({ settlements: [paid({ from: 'daniel', to: 'felipe', amountCents: 3000 })] }),
      'felipe',
      now
    )

    expect(board.owed.map(d => d.userId)).toEqual(['sofia'])
  })

  it('counts this month only, and counts money as moved only once confirmed', () => {
    const board = buildDashboard(ledger({
      settlds: [
        settld({ amountCents: 9000, paidBy: 'felipe', splitBetween: ['felipe', 'daniel'] }),
        settld({ id: 'old', amountCents: 5000, paidBy: 'felipe', splitBetween: ['felipe', 'daniel'], createdAt: '2026-07-10T19:00:00Z' })
      ],
      settlements: [
        paid({ from: 'daniel', to: 'felipe', amountCents: 4500 }),
        paid({ id: 'p2', from: 'daniel', to: 'felipe', amountCents: 1000, status: 'pending' })
      ]
    }), 'felipe', now)

    expect(board.month).toEqual({ settlds: 1, movedCents: 4500, settled: 1 })
  })

  it('holds up with nothing at all', () => {
    expect(buildDashboard({ settlds: [], settlements: [], people: [] }, 'felipe', now))
      .toMatchObject({ owedToYouCents: 0, youOweCents: 0, owed: [], owing: [], activity: [] })
  })

  it('keeps the activity feed short and newest first', () => {
    const many = ledger({
      settlds: Array.from({ length: 8 }, (_, i) =>
        settld({ id: `s${i}`, amountCents: 1000, paidBy: 'felipe', splitBetween: ['felipe', 'daniel'], createdAt: `2026-08-1${i}T10:00:00Z` })
      )
    })

    const board = buildDashboard(many, 'felipe', now)

    expect(board.activity).toHaveLength(5)
    expect(board.activity[0].at > board.activity[4].at).toBe(true)
  })

  it('puts a name to every debt, and a placeholder if somebody is gone', () => {
    const board = buildDashboard(ledger({ people: [felipe] }), 'felipe', now)
    expect(board.owed.every(d => d.person.name.length > 0)).toBe(true)
  })
})

describe('debtWith', () => {
  it('reads one person balance straight off the ledger', () => {
    expect(debtWith(ledger(), 'felipe', 'daniel')).toMatchObject({ netCents: 3000, userId: 'daniel' })
    expect(debtWith(ledger(), 'daniel', 'felipe')).toMatchObject({ netCents: -3000 })
  })
})

describe('groupByDay', () => {
  const now = new Date(2026, 7, 22, 12, 0)

  const at = (date: Date) => ({
    id: date.toISOString(),
    kind: 'settld' as const,
    title: 'x',
    settldId: 's1',
    personId: null,
    status: null,
    txHash: null,
    at: date.toISOString()
  })

  it('keeps the order and puts everything from one day under one heading', () => {
    const days = groupByDay([
      at(new Date(2026, 7, 22, 19, 0)),
      at(new Date(2026, 7, 22, 9, 0)),
      at(new Date(2026, 7, 21, 9, 0))
    ], now)

    expect(days.map(d => [d.label, d.items.length])).toEqual([['Today', 2], ['Yesterday', 1]])
  })

  it('returns nothing for an empty history', () => {
    expect(groupByDay([], now)).toEqual([])
  })
})

describe('dayLabel and formatWhen', () => {
  const now = new Date(2026, 7, 22, 12, 0)

  it('says today and yesterday instead of a date', () => {
    expect(dayLabel(new Date(2026, 7, 22, 19, 42).toISOString(), now)).toBe('Today')
    expect(dayLabel(new Date(2026, 7, 21, 9, 5).toISOString(), now)).toBe('Yesterday')
    expect(formatWhen(new Date(2026, 7, 22, 19, 42).toISOString(), now)).toMatch(/^Today /)
  })

  it('falls back to a plain date once it is older, with the year only when it differs', () => {
    expect(formatWhen(new Date(2026, 7, 12).toISOString(), now)).not.toMatch(/Today|Yesterday/)
    expect(dayLabel(new Date(2025, 7, 12).toISOString(), now)).toContain('2025')
    expect(dayLabel(new Date(2026, 7, 12).toISOString(), now)).not.toContain('2026')
  })
})
