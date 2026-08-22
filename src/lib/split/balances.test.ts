import { describe, expect, it } from 'vitest'
import type { Settld, Settlement } from './types'
import {
  balanceBetween,
  counterpartiesOf,
  debtsOf,
  participantsOf,
  settldsOf,
  sharesOf,
  splitEqually,
  standingOf
} from './balances'

const settld = (over: Partial<Settld> & Pick<Settld, 'amountCents' | 'paidBy' | 'splitBetween'>): Settld => ({
  id: 's1',
  description: 'Dinner',
  createdAt: '2026-08-22T00:00:00Z',
  ...over
})

const paid = (from: string, to: string, amountCents: number, status: Settlement['status'] = 'confirmed'): Settlement => ({
  id: `p-${from}-${to}-${amountCents}`,
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

describe('sharesOf', () => {
  it('gives every participant their slice, payer included', () => {
    expect(sharesOf(settld({ amountCents: 9000, paidBy: 'ana', splitBetween: ['ana', 'ben', 'cai'] })))
      .toEqual({ ana: 3000, ben: 3000, cai: 3000 })
  })
})

describe('balanceBetween', () => {
  const dinner = settld({ amountCents: 9000, paidBy: 'ana', splitBetween: ['ana', 'ben', 'cai'] })

  it('counts what the other person owes you for what you paid', () => {
    expect(balanceBetween([dinner], [], 'ana', 'ben')).toBe(3000)
  })

  it('is exactly the opposite from the other side', () => {
    expect(balanceBetween([dinner], [], 'ben', 'ana')).toBe(-3000)
  })

  it('says nothing about two people who only share a payer', () => {
    expect(balanceBetween([dinner], [], 'ben', 'cai')).toBe(0)
  })

  it('nets debts running in both directions into one number', () => {
    const taxi = settld({ id: 's2', amountCents: 2000, paidBy: 'ben', splitBetween: ['ana', 'ben'] })
    // Ben owes Ana 3000 for dinner, Ana owes Ben 1000 for the taxi.
    expect(balanceBetween([dinner, taxi], [], 'ana', 'ben')).toBe(2000)
  })

  it('clears the debt once the transfer is confirmed', () => {
    expect(balanceBetween([dinner], [paid('ben', 'ana', 3000)], 'ana', 'ben')).toBe(0)
  })

  it('keeps the debt alive while the transfer is only pending', () => {
    expect(balanceBetween([dinner], [paid('ben', 'ana', 3000, 'pending')], 'ana', 'ben')).toBe(3000)
  })

  it('shows an overpayment as a debt the other way, rather than hiding it', () => {
    expect(balanceBetween([dinner], [paid('ben', 'ana', 5000)], 'ana', 'ben')).toBe(-2000)
  })

  it('ignores a settld the payer left themselves out of, for the people not in it', () => {
    const gift = settld({ id: 's3', amountCents: 6000, paidBy: 'ana', splitBetween: ['ben', 'cai'] })
    expect(balanceBetween([gift], [], 'ana', 'ben')).toBe(3000)
    expect(balanceBetween([gift], [], 'ana', 'ana')).toBe(0)
  })
})

describe('counterpartiesOf', () => {
  it('finds everyone you share a settld with, however you are involved', () => {
    const dinner = settld({ amountCents: 9000, paidBy: 'ana', splitBetween: ['ana', 'ben', 'cai'] })
    expect(counterpartiesOf([dinner], [], 'ana')).toEqual(['ben', 'cai'])
    expect(counterpartiesOf([dinner], [], 'ben')).toEqual(['ana', 'cai'])
  })

  it('leaves out the settlds you have nothing to do with', () => {
    const theirs = settld({ amountCents: 9000, paidBy: 'ben', splitBetween: ['ben', 'cai'] })
    expect(counterpartiesOf([theirs], [], 'ana')).toEqual([])
  })

  it('remembers somebody you have only ever paid', () => {
    expect(counterpartiesOf([], [paid('ana', 'zoe', 500)], 'ana')).toEqual(['zoe'])
  })
})

describe('debtsOf and standingOf', () => {
  const dinner = settld({ amountCents: 9000, paidBy: 'ana', splitBetween: ['ana', 'ben', 'cai'] })
  const taxi = settld({ id: 's2', amountCents: 6000, paidBy: 'dan', splitBetween: ['ana', 'dan'] })

  it('lists both directions, biggest first, breaking ties the same way every time', () => {
    expect(debtsOf([dinner, taxi], [], 'ana')).toEqual([
      { userId: 'ben', netCents: 3000 },
      { userId: 'cai', netCents: 3000 },
      { userId: 'dan', netCents: -3000 }
    ])
  })

  it('puts a bigger debt above a smaller one, whichever way it runs', () => {
    const big = settld({ id: 's3', amountCents: 40000, paidBy: 'zoe', splitBetween: ['ana', 'zoe'] })
    expect(debtsOf([dinner, big], [], 'ana')[0]).toEqual({ userId: 'zoe', netCents: -20000 })
  })

  it('drops anybody you are square with', () => {
    const debts = debtsOf([dinner], [paid('ben', 'ana', 3000)], 'ana')
    expect(debts.map(d => d.userId)).toEqual(['cai'])
  })

  it('adds up both directions without letting them cancel out', () => {
    const standing = standingOf([dinner, taxi], [], 'ana')

    expect(standing.owedToYouCents).toBe(6000)
    expect(standing.youOweCents).toBe(3000)
    expect(standing.isSettled).toBe(false)
  })

  it('knows when there is nothing left open', () => {
    expect(standingOf([], [], 'ana')).toMatchObject({ owedToYouCents: 0, youOweCents: 0, isSettled: true })
  })
})

describe('settldsOf', () => {
  it('keeps the ones you paid for and the ones you are split into', () => {
    const yours = settld({ amountCents: 100, paidBy: 'ana', splitBetween: ['ana'] })
    const shared = settld({ id: 's2', amountCents: 100, paidBy: 'ben', splitBetween: ['ana', 'ben'] })
    const theirs = settld({ id: 's3', amountCents: 100, paidBy: 'ben', splitBetween: ['ben', 'cai'] })

    expect(settldsOf([yours, shared, theirs], 'ana').map(s => s.id)).toEqual(['s1', 's2'])
  })
})

describe('participantsOf', () => {
  const dinner = settld({ amountCents: 9000, paidBy: 'ana', splitBetween: ['ana', 'ben', 'cai'] })

  it('marks the payer as paid and everybody else by what they still owe', () => {
    expect(participantsOf(dinner, [], [dinner])).toEqual([
      { userId: 'ana', shareCents: 3000, status: 'paid' },
      { userId: 'ben', shareCents: 3000, status: 'owes' },
      { userId: 'cai', shareCents: 3000, status: 'owes' }
    ])
  })

  it('marks somebody settled once they are square with the payer', () => {
    const participants = participantsOf(dinner, [paid('ben', 'ana', 3000)], [dinner])
    expect(participants.find(p => p.userId === 'ben')?.status).toBe('settled')
  })

  it('judges by the whole balance with the payer, not by this settld alone', () => {
    // Ben owes Ana 3000 for dinner, but Ana owes Ben 5000 for the flat: Ben is not short.
    const flat = settld({ id: 's2', amountCents: 10000, paidBy: 'ben', splitBetween: ['ana', 'ben'] })
    const participants = participantsOf(dinner, [], [dinner, flat])

    expect(participants.find(p => p.userId === 'ben')?.status).toBe('settled')
  })
})
