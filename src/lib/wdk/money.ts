/**
 * Conversiones entre las tres formas en que aparece la plata en Split:
 * lo que ve el usuario ($30.00), lo que guardamos (3000 centavos) y lo que
 * viaja on-chain (30000000 unidades de USD₮).
 */

import { TOKEN_UNITS_PER_CENT } from '@/lib/split/types'

export const centsToTokenUnits = (cents: number): bigint =>
  BigInt(Math.round(cents)) * BigInt(TOKEN_UNITS_PER_CENT)

export const tokenUnitsToCents = (units: bigint): number =>
  Number(units / BigInt(TOKEN_UNITS_PER_CENT))

/** Formatea centavos como "$30.00". Es el único formato que ve el usuario. */
export function formatMoney (cents: number, { sign = false }: { sign?: boolean } = {}): string {
  const abs = Math.abs(cents)
  const formatted = `$${(abs / 100).toFixed(2)}`

  if (!sign) return formatted
  if (cents > 0) return `+${formatted}`
  if (cents < 0) return `−${formatted}`
  return formatted
}

/** Parsea lo que el usuario tipea ("120", "120.50", "$120,50") a centavos. */
export function parseMoney (input: string): number | null {
  const cleaned = input.trim().replace(/[$\s]/g, '').replace(',', '.')
  if (!cleaned) return null

  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null

  return Math.round(value * 100)
}
