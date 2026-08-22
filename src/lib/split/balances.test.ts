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
  it('divide en partes iguales cuando el monto es divisible', () => {
    expect(splitEqually(12000, 4)).toEqual([3000, 3000, 3000, 3000])
  })

  it('reparte los centavos sobrantes entre los primeros, sin perder ni inventar plata', () => {
    const shares = splitEqually(1000, 3)
    expect(shares).toEqual([334, 333, 333])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it('devuelve vacío si no hay entre quiénes dividir', () => {
    expect(splitEqually(1000, 0)).toEqual([])
  })
})

describe('computeNetBalances', () => {
  it('acredita al que pagó y debita a cada participante', () => {
    // Daniel paga una cena de $120 para 4. Cada uno debe $30.
    const balances = computeNetBalances(
      [expense({ amountCents: 12000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] })],
      []
    )
    expect(balances).toEqual({ daniel: 9000, felipe: -3000, sofia: -3000, andres: -3000 })
  })

  it('siempre suma cero: lo que uno debe, otro lo tiene a favor', () => {
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

  it('un pago confirmado cancela la deuda', () => {
    const expenses = [expense({ amountCents: 2000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'] })]
    expect(computeNetBalances(expenses, [])).toEqual({ daniel: 1000, felipe: -1000 })
    expect(computeNetBalances(expenses, [settlement('felipe', 'daniel', 1000)])).toEqual({ daniel: 0, felipe: 0 })
  })

  it('ignora pagos que todavía no confirmaron en la blockchain', () => {
    const expenses = [expense({ amountCents: 2000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe'] })]
    const pending = [settlement('felipe', 'daniel', 1000, 'pending')]
    const failed = [settlement('felipe', 'daniel', 1000, 'failed')]
    expect(computeNetBalances(expenses, pending)).toEqual({ daniel: 1000, felipe: -1000 })
    expect(computeNetBalances(expenses, failed)).toEqual({ daniel: 1000, felipe: -1000 })
  })
})

describe('whoOwesWho', () => {
  it('con un solo gasto, cada participante le debe su parte al que pagó', () => {
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

  it('no devuelve nada si el grupo ya está saldado', () => {
    expect(whoOwesWho([], [])).toEqual([])
  })

  it('minimiza la cantidad de transferencias', () => {
    // El ejemplo del doc: 4 gastos, 4 personas, se salda con 3 pagos.
    const expenses = [
      expense({ id: 'a', amountCents: 40000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
      expense({ id: 'b', amountCents: 12000, paidBy: 'felipe', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
      expense({ id: 'c', amountCents: 4000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] }),
      expense({ id: 'd', amountCents: 8000, paidBy: 'sofia', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] })
    ]
    const payments = whoOwesWho(expenses, [])
    expect(payments).toHaveLength(3)

    // Y el resultado deja a todos en cero.
    const after = computeNetBalances(expenses, payments.map((p, i) => settlement(p.from, p.to, p.amountCents)).map((s, i) => ({ ...s, id: `s${i}` })))
    expect(Object.values(after).every(v => v === 0)).toBe(true)
  })

  it('es determinístico: mismo input, mismo orden de pagos', () => {
    const expenses = [
      expense({ id: 'a', amountCents: 30000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia'] }),
      expense({ id: 'b', amountCents: 9000, paidBy: 'sofia', splitBetween: ['daniel', 'felipe', 'sofia'] })
    ]
    expect(whoOwesWho(expenses, [])).toEqual(whoOwesWho(expenses, []))
  })
})

describe('settlementPlan', () => {
  it('separa lo que el usuario tiene que pagar de lo que le tienen que pagar', () => {
    const expenses = [expense({ amountCents: 12000, paidBy: 'daniel', splitBetween: ['daniel', 'felipe', 'sofia', 'andres'] })]
    const plan = settlementPlan(expenses, [], 'felipe')

    expect(plan.netCents).toBe(-3000)
    expect(plan.owes).toEqual([{ from: 'felipe', to: 'daniel', amountCents: 3000 }])
    expect(plan.owed).toEqual([])
    expect(plan.isSettled).toBe(false)
  })

  it('marca como saldado a quien no debe ni le deben', () => {
    const plan = settlementPlan([], [], 'felipe')
    expect(plan.isSettled).toBe(true)
    expect(plan.netCents).toBe(0)
  })
})
