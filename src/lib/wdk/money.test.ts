import { describe, expect, it } from 'vitest'
import { decodeSuccess } from './receipt'
import { centsToTokenUnits, formatMoney, parseMoney, tokenUnitsToCents } from './money'

describe('conversion to USD₮ units', () => {
  it('converts cents into the token 6 decimals', () => {
    expect(centsToTokenUnits(3000)).toBe(30_000_000n) // $30.00
    expect(centsToTokenUnits(1)).toBe(10_000n) // one cent
  })

  it('converts token units back into cents', () => {
    expect(tokenUnitsToCents(30_000_000n)).toBe(3000)
  })

  it('round-trips without losing money', () => {
    for (const cents of [1, 99, 100, 1234, 999_999]) {
      expect(tokenUnitsToCents(centsToTokenUnits(cents))).toBe(cents)
    }
  })
})

describe('formatMoney', () => {
  it('always shows two decimals', () => {
    expect(formatMoney(3000)).toBe('$30.00')
    expect(formatMoney(5)).toBe('$0.05')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('when signed, uses the absolute value and marks the direction', () => {
    expect(formatMoney(3000, { sign: true })).toBe('+$30.00')
    expect(formatMoney(-3000, { sign: true })).toBe('−$30.00')
    expect(formatMoney(0, { sign: true })).toBe('$0.00')
  })
})

describe('parseMoney', () => {
  it('accepts what people actually type', () => {
    expect(parseMoney('120')).toBe(12000)
    expect(parseMoney('120.50')).toBe(12050)
    expect(parseMoney('$120,50')).toBe(12050)
    expect(parseMoney('  12.5 ')).toBe(1250)
  })

  it('rounds to the nearest cent', () => {
    expect(parseMoney('10.999')).toBe(1100)
  })

  it('rejects anything that is not an amount', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('-10')).toBeNull()
  })
})

describe('decodeSuccess', () => {
  const word = (hex: string) => hex.padStart(64, '0')

  it('reads the success flag from a real EntryPoint event', () => {
    // nonce=0, success=1, actualGasCost, actualGasUsed
    const data = '0x' + word('0') + word('1') + word('1ff744d88ec90') + word('7d537')
    expect(decodeSuccess(data)).toBe(true)
  })

  it('detects an operation that executed but failed', () => {
    const data = '0x' + word('0') + word('0') + word('1ff744d88ec90') + word('7d537')
    expect(decodeSuccess(data)).toBe(false)
  })

  it('does not invent a success from truncated data', () => {
    expect(decodeSuccess('0x' + word('0'))).toBe(false)
    expect(decodeSuccess('0x')).toBe(false)
  })
})
