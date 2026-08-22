import { describe, expect, it } from 'vitest'
import type { Expense, Settlement } from './types'
import { computeNetBalances, settlementPlan, splitEqually, whoOwesWho } from './balances'

const expense = (over: Partial<Expense> & Pick<Expense, 'amountCents' | 'paidBy' | 'splitBetween'>): Expense => ({
  id: 'e1',
  groupId: 'g1',
  description: 'test',
  createdAt: '2026-08-22T00:00:00Z',
  ...over
})

const settlement = (from: string, to: string, amountCents: number, status: Settlement['status'] = 'confirmed'): Settlement => ({
  id: `s-${from}-${to}`,
  groupId: 'g1',
  from,
  to,
  amountCents,
  status,
  createdAt: '2026-08-22T00:00:00Z'
})

describe('splitEqually', () => {
  it('splits evenly when the amount divides cleanly', () => {
    expect(splitEqually(12000, 4)).toEqual([3000, 3000, 3000, 3000])
  })

  it('hands the leftover cents to the first people, losing and inventing nothing', () => {
    const shares = splitEqually(1000, 3)
    expect(shares).toEqual([334, 333, 333])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it('returns empty when there is nobody to split between', () => {
    expect(splitEqually(1000, 0)).toEqual([])
  })
})

describe('computeNetBalances', () => {
  it('credits whoever paid and debits every participant', () => {
    // Daniel pays a $120 dinner for 4. Each one owes $30.
    const balances = computeNetBalances(
      [expense({ amountCents: 12000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] })],
      []
    )
    expect(balances).toEqual({ daniel: 9000, felipe: -3000, sofia: -3000, andres: -3000 })
  })

  it('always sums to zero: what one owes, another is owed', () => {
    const balances = computeNetBalances(
      [
        expense({ id: 'a', amountCents: 40000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
        expense({ id: 'b', amountCents: 12000, paidBy: 'felipe', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
        expense({ id: 'c', amountCents: 1000, paidBy: 'sofia', splitBetween: ['daniel', 'sofia'] })
      ],
      []
    )
    const total = Object.values(balances).reduce((a, b) => a + b, 0)
    expect(total).toBe(0)
  })

  it('a confirmed payment clears the debt', () => {
    const expenses = [expense({ amountCents: 2000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'] })]
    expect(computeNetBalances(expenses, [])).toEqual({ daniel: 1000, felipe: -1000 })
    expect(computeNetBalances(expenses, [settlement('felipe', 'daniel', 1000)])).toEqual({ daniel: 0, felipe: 0 })
  })

  it('ignores payments not yet confirmed on the blockchain', () => {
    const expenses = [expense({ amountCents: 2000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'] })]
    const pending = [settlement('felipe', 'daniel', 1000, 'pending')]
    const failed = [settlement('felipe', 'daniel', 1000, 'failed')]
    expect(computeNetBalances(expenses, pending)).toEqual({ daniel: 1000, felipe: -1000 })
    expect(computeNetBalances(expenses, failed)).toEqual({ daniel: 1000, felipe: -1000 })
  })
})

describe('whoOwesWho', () => {
  it('with a single expense, each participant owes their share to whoever paid', () => {
    const payments = whoOwesWho(
      [expense({ amountCents: 12000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] })],
      []
    )
    expect(payments).toEqual([
      { from: 'andres', to: 'daniel', amountCents: 3000 },
      { from: 'felipe', to: 'daniel', amountCents: 3000 },
      { from: 'sofia', to: 'daniel', amountCents: 3000 }
    ])
  })

  it('returns nothing when the group is already settled', () => {
    expect(whoOwesWho([], [])).toEqual([])
  })

  it('minimises the number of transfers', () => {
    // The example from the spec: 4 expenses, 4 people, settled with 3 payments.
    const expenses = [
      expense({ id: 'a', amountCents: 40000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
      expense({ id: 'b', amountCents: 12000, paidBy: 'felipe', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
      expense({ id: 'c', amountCents: 4000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
      expense({ id: 'd', amountCents: 8000, paidBy: 'sofia', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] })
    ]
    const payments = whoOwesWho(expenses, [])
    expect(payments).toHaveLength(3)

    // And the result leaves everyone at zero.
    const after = computeNetBalances(expenses, payments.map((p, i) => settlement(p.from, p.to, p.amountCents)).map((s, i) => ({ ...s, id: `s${i}` })))
    expect(Object.values(after).every(v => v === 0)).toBe(true)
  })

  it('is deterministic: same input, same order of payments', () => {
    const expenses = [
      expense({ id: 'a', amountCents: 30000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia'] }),
      expense({ id: 'b', amountCents: 9000, paidBy: 'sofia', splitBetween: ['daniel', 'felipe', 'sofia'] })
    ]
    expect(whoOwesWho(expenses, [])).toEqual(whoOwesWho(expenses, []))
  })
})

describe('settlementPlan', () => {
  it('separates what the user has to pay from what they are owed', () => {
    const expenses = [expense({ amountCents: 12000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] })]
    const plan = settlementPlan(expenses, [], 'felipe')

    expect(plan.netCents).toBe(-3000)
    expect(plan.owes).toEqual([{ from: 'felipe', to: 'daniel', amountCents: 3000 }])
    expect(plan.owed).toEqual([])
    expect(plan.isSettled).toBe(false)
  })

  it('marks anyone who neither owes nor is owed as settled', () => {
    const plan = settlementPlan([], [], 'felipe')
    expect(plan.isSettled).toBe(true)
    expect(plan.netCents).toBe(0)
  })
})
