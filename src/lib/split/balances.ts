/**
 * El cerebro de Settld: a partir de los gastos de un grupo, calcula quién le debe a quién
 * y cuál es el conjunto más chico de transferencias que deja a todos en cero.
 *
 * Todo acá es una función pura sobre enteros. No hay blockchain, no hay red, no hay estado:
 * Settld decide QUIÉN le paga a QUIÉN, y recién después WDK ejecuta esos pagos.
 */

import type { Expense, Payment, Settlement } from './types'

/**
 * Divide un monto en partes iguales sin perder ni inventar centavos.
 * El sobrante se reparte de a un centavo entre los primeros participantes.
 */
export function splitEqually (amountCents: number, participants: number): number[] {
  if (participants <= 0) return []

  const base = Math.floor(amountCents / participants)
  const remainder = amountCents - base * participants

  return Array.from({ length: participants }, (_, i) => base + (i < remainder ? 1 : 0))
}

/**
 * Balance neto de cada persona, en centavos.
 * Positivo = le deben plata. Negativo = debe plata. La suma total siempre da cero.
 *
 * Sólo descuenta los settlements confirmados en la blockchain: mientras una transferencia
 * está pendiente o falló, la deuda sigue viva.
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
 * Reduce los balances netos al conjunto mínimo de transferencias que salda el grupo.
 *
 * Es el clásico greedy de "el que más debe le paga al que más le deben": va emparejando
 * al deudor más grande con el acreedor más grande hasta que alguno de los dos queda en cero.
 * Cada paso liquida al menos a una persona, así que nunca hacen falta más de N-1 pagos.
 */
export function whoOwesWho (expenses: Expense[], settlements: Settlement[]): Payment[] {
  const balances = computeNetBalances(expenses, settlements)

  // Los ordenamos por monto —de mayor a menor en valor absoluto— y desempatamos
  // alfabéticamente por id, para que el mismo grupo produzca siempre el mismo plan.
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
  /** Balance del usuario en centavos: positivo si le deben, negativo si debe. */
  netCents: number
  /** Transferencias que el usuario tiene que hacer desde su propia wallet. */
  owes: Payment[]
  /** Transferencias que otros le tienen que hacer a él. */
  owed: Payment[]
  isSettled: boolean
}

/**
 * El plan visto desde los ojos de una persona. Es lo que alimenta la pantalla de Settle Up.
 *
 * Importante: cada usuario sólo confirma las transferencias que salen de SU wallet.
 * Settld nunca ejecuta un pago en nombre de otro.
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
