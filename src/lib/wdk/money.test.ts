import { describe, expect, it } from 'vitest'
import { decodeSuccess } from './receipt'
import { centsToTokenUnits, formatMoney, parseMoney, tokenUnitsToCents } from './money'

describe('conversión a unidades de USD₮', () => {
  it('convierte centavos a las 6 decimales del token', () => {
    expect(centsToTokenUnits(3000)).toBe(30_000_000n) // $30.00
    expect(centsToTokenUnits(1)).toBe(10_000n) // un centavo
  })

  it('vuelve de unidades del token a centavos', () => {
    expect(tokenUnitsToCents(30_000_000n)).toBe(3000)
  })

  it('va y vuelve sin perder plata', () => {
    for (const cents of [1, 99, 100, 1234, 999_999]) {
      expect(tokenUnitsToCents(centsToTokenUnits(cents))).toBe(cents)
    }
  })
})

describe('formatMoney', () => {
  it('siempre muestra dos decimales', () => {
    expect(formatMoney(3000)).toBe('$30.00')
    expect(formatMoney(5)).toBe('$0.05')
    expect(formatMoney(0)).toBe('$0.00')
  })

  it('con signo, usa el valor absoluto y marca la dirección', () => {
    expect(formatMoney(3000, { sign: true })).toBe('+$30.00')
    expect(formatMoney(-3000, { sign: true })).toBe('−$30.00')
    expect(formatMoney(0, { sign: true })).toBe('$0.00')
  })
})

describe('parseMoney', () => {
  it('acepta lo que la gente realmente tipea', () => {
    expect(parseMoney('120')).toBe(12000)
    expect(parseMoney('120.50')).toBe(12050)
    expect(parseMoney('$120,50')).toBe(12050)
    expect(parseMoney('  12.5 ')).toBe(1250)
  })

  it('redondea al centavo más cercano', () => {
    expect(parseMoney('10.999')).toBe(1100)
  })

  it('rechaza lo que no es un monto', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('-10')).toBeNull()
  })
})

describe('decodeSuccess', () => {
  const word = (hex: string) => hex.padStart(64, '0')

  it('lee el flag de éxito de un evento real del EntryPoint', () => {
    // nonce=0, success=1, actualGasCost, actualGasUsed
    const data = '0x' + word('0') + word('1') + word('1ff744d88ec90') + word('7d537')
    expect(decodeSuccess(data)).toBe(true)
  })

  it('detecta una operación que se ejecutó pero falló', () => {
    const data = '0x' + word('0') + word('0') + word('1ff744d88ec90') + word('7d537')
    expect(decodeSuccess(data)).toBe(false)
  })

  it('ante datos truncados no inventa un éxito', () => {
    expect(decodeSuccess('0x' + word('0'))).toBe(false)
    expect(decodeSuccess('0x')).toBe(false)
  })
})
