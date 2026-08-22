import { describe, expect, it } from 'vitest'
import { migrateSettlds, migrateSettlements, needsMigration } from './migrate'

/** A database exactly as the version with groups wrote it. */
const legacy = {
  users: [{ id: 'felipe', name: 'Felipe', username: 'felipe', walletAddress: '0xabc' }],
  groups: [{ id: 'g1', name: 'Friday dinner', memberIds: ['felipe', 'daniel'], createdAt: '2026-08-01T00:00:00Z' }],
  expenses: [
    {
      id: 'e1',
      groupId: 'g1',
      description: 'Dinner at Sikwa',
      amountCents: 14680,
      paidBy: 'felipe',
      splitBetween: ['felipe', 'daniel'],
      createdAt: '2026-08-22T19:00:00Z'
    }
  ],
  settlements: [
    {
      id: 'p1',
      groupId: 'g1',
      from: 'daniel',
      to: 'felipe',
      amountCents: 7340,
      status: 'confirmed',
      txHash: '0xdeadbeef',
      createdAt: '2026-08-22T20:00:00Z'
    }
  ]
}

describe('migrateSettlds', () => {
  it('keeps the money and the people, and drops the folder', () => {
    expect(migrateSettlds(legacy)).toEqual([
      {
        id: 'e1',
        description: 'Dinner at Sikwa',
        amountCents: 14680,
        paidBy: 'felipe',
        splitBetween: ['felipe', 'daniel'],
        createdAt: '2026-08-22T19:00:00Z'
      }
    ])
  })

  it('prefers the new field once it exists, so a migrated database stops changing', () => {
    const migrated = { settlds: [{ id: 'n1', description: 'New', amountCents: 100, paidBy: 'a', splitBetween: ['a', 'b'], createdAt: '2026-08-22T00:00:00Z' }], expenses: legacy.expenses }
    expect(migrateSettlds(migrated).map(s => s.id)).toEqual(['n1'])
  })

  it('drops a record too damaged to become a debt instead of guessing', () => {
    const broken = { expenses: [{ id: 'x' }, { id: 'y', amountCents: 100, paidBy: 'a', splitBetween: ['a'] }] }
    expect(migrateSettlds(broken).map(s => s.id)).toEqual(['y'])
  })

  it('opens an empty database without complaining', () => {
    expect(migrateSettlds({})).toEqual([])
  })
})

describe('migrateSettlements', () => {
  it('keeps the payment whole, minus the group it was filed under', () => {
    expect(migrateSettlements(legacy)).toEqual([
      {
        id: 'p1',
        from: 'daniel',
        to: 'felipe',
        amountCents: 7340,
        status: 'confirmed',
        txHash: '0xdeadbeef',
        createdAt: '2026-08-22T20:00:00Z'
      }
    ])
  })

  it('never invents a confirmation for a status it does not recognise', () => {
    const odd = { settlements: [{ id: 'p2', from: 'a', to: 'b', amountCents: 1, status: 'whatever' }] }
    expect(migrateSettlements(odd)[0].status).toBe('pending')
  })

  it('leaves out the hash fields when there are none, rather than storing undefined', () => {
    const bare = { settlements: [{ id: 'p3', from: 'a', to: 'b', amountCents: 1, status: 'pending', createdAt: '2026-08-22T00:00:00Z' }] }
    expect(migrateSettlements(bare)[0]).not.toHaveProperty('txHash')
  })
})

describe('needsMigration', () => {
  it('spots a database still in the old shape', () => {
    expect(needsMigration(legacy)).toBe(true)
    expect(needsMigration({ groups: [] })).toBe(true)
  })

  it('leaves a database that has already moved alone', () => {
    expect(needsMigration({ settlds: [], settlements: [] })).toBe(false)
  })
})
