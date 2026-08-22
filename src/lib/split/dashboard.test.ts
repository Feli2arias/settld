import { describe, expect, it } from 'vitest'
import type { Expense, Settlement, User } from './types'
import { type GroupDetailLike, buildDashboard, formatWhen, groupActivity, memberShares } from './dashboard'

const user = (id: string, name: string): User => ({
  id,
  name,
  username: id,
  walletAddress: `0x${id}`
})

const daniel = user('daniel', 'Daniel Rossi')
const felipe = user('felipe', 'Felipe Arias')
const sofia = user('sofia', 'Sofía Núñez')

const expense = (over: Partial<Expense> & Pick<Expense, 'amountCents' | 'paidBy' | 'splitBetween'>): Expense => ({
  id: 'e1',
  groupId: 'g1',
  description: 'Dinner',
  createdAt: '2026-08-20T19:00:00Z',
  ...over
})

const settlement = (over: Partial<Settlement> & Pick<Settlement, 'from' | 'to' | 'amountCents'>): Settlement => ({
  id: 's1',
  groupId: 'g1',
  status: 'confirmed',
  createdAt: '2026-08-21T19:00:00Z',
  ...over
})

/** A dinner Daniel paid for, split three ways. */
const dinner = (over: Partial<GroupDetailLike> = {}): GroupDetailLike => ({
  group: { id: 'g1', name: 'Friday dinner', memberIds: ['daniel', 'felipe', 'sofia'], createdAt: '2026-08-01T00:00:00Z' },
  members: [daniel, felipe, sofia],
  expenses: [expense({ amountCents: 9000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia'] })],
  settlements: [],
  ...over
})

describe('memberShares', () => {
  it('gives everyone their share and places them by their balance', () => {
    expect(memberShares(dinner())).toEqual([
      { user: daniel, shareCents: 3000, status: 'paid' },
      { user: felipe, shareCents: 3000, status: 'owes' },
      { user: sofia, shareCents: 3000, status: 'owes' }
    ])
  })

  it('moves someone to settled once their transfer is confirmed', () => {
    const detail = dinner({ settlements: [settlement({ from: 'felipe', to: 'daniel', amountCents: 3000 })] })
    expect(memberShares(detail).find(m => m.user.id === 'felipe')?.status).toBe('settled')
  })

  it('leaves a pending transfer owing, because the money has not landed', () => {
    const detail = dinner({
      settlements: [settlement({ from: 'felipe', to: 'daniel', amountCents: 3000, status: 'pending' })]
    })
    expect(memberShares(detail).find(m => m.user.id === 'felipe')?.status).toBe('owes')
  })

  it('counts someone into the total only for the expenses they were part of', () => {
    const detail = dinner({
      expenses: [expense({ amountCents: 9000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'] })]
    })
    expect(memberShares(detail).find(m => m.user.id === 'sofia')?.shareCents).toBe(0)
  })
})

describe('groupActivity', () => {
  it('writes each event from the reader point of view, newest first', () => {
    const detail = dinner({ settlements: [settlement({ from: 'felipe', to: 'daniel', amountCents: 3000 })] })

    expect(groupActivity(detail, 'daniel').map(item => item.title)).toEqual([
      'Felipe paid you $30.00',
      'You added Dinner'
    ])

    expect(groupActivity(detail, 'felipe').map(item => item.title)).toEqual([
      'You paid Daniel $30.00',
      'Daniel added Dinner'
    ])

    expect(groupActivity(detail, 'sofia').map(item => item.title)).toEqual([
      'Felipe paid Daniel $30.00',
      'Daniel added Dinner'
    ])
  })

  it('carries the settlement status so a pending payment can be flagged', () => {
    const detail = dinner({
      settlements: [settlement({ from: 'felipe', to: 'daniel', amountCents: 3000, status: 'pending' })]
    })
    expect(groupActivity(detail, 'daniel')[0].status).toBe('pending')
  })
})

describe('buildDashboard', () => {
  const now = new Date('2026-08-22T12:00:00Z')

  it('adds up what you are owed across every group', () => {
    const board = buildDashboard([dinner()], 'daniel', now)

    expect(board.owedToYouCents).toBe(6000)
    expect(board.youOweCents).toBe(0)
    expect(board.peopleOwingYou).toBe(2)
    expect(board.pendingPayments).toBe(0)
  })

  it('adds up what you owe, and how many transfers that means', () => {
    const trip: GroupDetailLike = {
      group: { id: 'g2', name: 'Road trip', memberIds: ['felipe', 'sofia'], createdAt: '2026-08-02T00:00:00Z' },
      members: [felipe, sofia],
      expenses: [expense({ id: 'e2', groupId: 'g2', amountCents: 4000, paidBy: 'sofia', splitBetween: ['felipe', 'sofia'] })],
      settlements: []
    }

    const board = buildDashboard([dinner(), trip], 'felipe', now)

    expect(board.youOweCents).toBe(3000 + 2000)
    expect(board.pendingPayments).toBe(2)
    expect(board.owedToYouCents).toBe(0)
  })

  it('puts the group with the most at stake first, and under the spotlight', () => {
    const quiet: GroupDetailLike = {
      group: { id: 'g3', name: 'Settled up', memberIds: ['daniel', 'felipe'], createdAt: '2026-08-03T00:00:00Z' },
      members: [daniel, felipe],
      expenses: [],
      settlements: []
    }

    const board = buildDashboard([quiet, dinner()], 'daniel', now)

    expect(board.groups.map(card => card.group.id)).toEqual(['g1', 'g3'])
    expect(board.focus?.group.id).toBe('g1')
    expect(board.focus?.paidByYouCents).toBe(9000)
    expect(board.focus?.members).toHaveLength(3)
  })

  it('counts this month only, and counts money as moved only once confirmed', () => {
    const detail = dinner({
      expenses: [
        expense({ amountCents: 9000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'] }),
        expense({ id: 'old', amountCents: 5000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'], createdAt: '2026-07-10T19:00:00Z' })
      ],
      settlements: [
        settlement({ from: 'felipe', to: 'daniel', amountCents: 4500 }),
        settlement({ id: 's2', from: 'felipe', to: 'daniel', amountCents: 1000, status: 'pending' })
      ]
    })

    expect(buildDashboard([detail], 'daniel', now).month).toEqual({
      expenses: 1,
      movedCents: 4500,
      settled: 1
    })
  })

  it('holds up with no groups at all', () => {
    expect(buildDashboard([], 'daniel', now)).toMatchObject({
      owedToYouCents: 0,
      youOweCents: 0,
      groups: [],
      activity: [],
      focus: null
    })
  })

  it('keeps the activity feed short, newest first, across groups', () => {
    const many = dinner({
      expenses: Array.from({ length: 8 }, (_, i) =>
        expense({ id: `e${i}`, amountCents: 1000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'], createdAt: `2026-08-1${i}T10:00:00Z` })
      )
    })

    const board = buildDashboard([many], 'daniel', now)

    expect(board.activity).toHaveLength(5)
    expect(board.activity[0].at > board.activity[4].at).toBe(true)
  })
})

describe('formatWhen', () => {
  const now = new Date(2026, 7, 22, 12, 0)

  it('says today and yesterday instead of a date', () => {
    expect(formatWhen(new Date(2026, 7, 22, 19, 42).toISOString(), now)).toMatch(/^Today /)
    expect(formatWhen(new Date(2026, 7, 21, 9, 5).toISOString(), now)).toMatch(/^Yesterday /)
  })

  it('falls back to a plain date once it is older than that', () => {
    const label = formatWhen(new Date(2026, 7, 12, 9, 5).toISOString(), now)
    expect(label).not.toMatch(/Today|Yesterday/)
    expect(label).toContain('12')
  })
})
