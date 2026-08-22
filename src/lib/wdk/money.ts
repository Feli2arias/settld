/**
 * Conversions between the three shapes money takes in Settld: what the user sees
 * ($30.00), what we store (3000 cents) and what travels on-chain (30000000 USD₮ units).
 */

import { TOKEN_UNITS_PER_CENT } from '@/lib/split/types'

export const centsToTokenUnits = (cents: number): bigint =>
  BigInt(Math.round(cents)) * BigInt(TOKEN_UNITS_PER_CENT)

export const tokenUnitsToCents = (units: bigint): number =>
  Number(units / BigInt(TOKEN_UNITS_PER_CENT))

/** Formats cents as "$30.00". It is the only format the user ever sees. */
export function formatMoney (cents: number, { sign = false }: { sign?: boolean } = {}): string {
  const abs = Math.abs(cents)
  const formatted = `$${(abs / 100).toFixed(2)}`

  if (!sign) return formatted
  if (cents > 0) return `+${formatted}`
  if (cents < 0) return `−${formatted}`
  return formatted
}

/** Parses what the user types ("120", "120.50", "$120,50") into cents. */
export function parseMoney (input: string): number | null {
  const cleaned = input.trim().replace(/[$\s]/g, '').replace(',', '.')
  if (!cleaned) return null

  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null

  return Math.round(value * 100)
}
