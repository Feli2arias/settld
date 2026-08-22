import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { UnsignableUrlError, sanitizeBuyUrl, signBuyUrl, signQuery } from './onramp-signature'

const OPTIONS = {
  apiKey: 'pk_test_key',
  secretKey: 'sk_test_secret',
  environment: 'sandbox' as const,
  redirectOrigin: 'https://settld.app'
}

const url = (params: Record<string, string> = {}) => {
  const built = new URL('https://buy-sandbox.moonpay.com/')
  const all = {
    apiKey: 'pk_test_key',
    currencyCode: 'usdt',
    baseCurrencyCode: 'usd',
    baseCurrencyAmount: '50.00',
    walletAddress: '0x116788A0b50CDf2D44fd182FEF6864BE82c31D1B',
    ...params
  }
  for (const [key, value] of Object.entries(all)) built.searchParams.append(key, value)
  return built.toString()
}

describe('sanitizeBuyUrl', () => {
  it('keeps the parameters of a normal checkout', () => {
    const clean = sanitizeBuyUrl(url(), OPTIONS)

    expect(clean.host).toBe('buy-sandbox.moonpay.com')
    expect(clean.searchParams.get('baseCurrencyAmount')).toBe('50.00')
    expect(clean.searchParams.get('walletAddress')).toBe('0x116788A0b50CDf2D44fd182FEF6864BE82c31D1B')
  })

  it('drops anything it does not recognise instead of signing it', () => {
    const clean = sanitizeBuyUrl(url({ externalTransactionId: 'whatever', foo: 'bar' }), OPTIONS)

    expect(clean.searchParams.get('externalTransactionId')).toBeNull()
    expect(clean.searchParams.get('foo')).toBeNull()
  })

  it('sends the buyer back to us, never where the caller asked', () => {
    const clean = sanitizeBuyUrl(url({ redirectURL: 'https://evil.example/steal' }), OPTIONS)
    expect(clean.searchParams.get('redirectURL')).toBe('https://settld.app/home')
  })

  it('refuses to sign for anybody but us', () => {
    expect(() => sanitizeBuyUrl(url({ apiKey: 'pk_test_someone_else' }), OPTIONS))
      .toThrow(UnsignableUrlError)
  })

  it('refuses a link that is not MoonPay', () => {
    expect(() => sanitizeBuyUrl('https://evil.example/?apiKey=pk_test_key', OPTIONS))
      .toThrow(UnsignableUrlError)
    expect(() => sanitizeBuyUrl('http://buy-sandbox.moonpay.com/?apiKey=pk_test_key', OPTIONS))
      .toThrow(UnsignableUrlError)
    expect(() => sanitizeBuyUrl('not a url at all', OPTIONS)).toThrow(UnsignableUrlError)
  })

  it('refuses a checkout with no valid destination', () => {
    expect(() => sanitizeBuyUrl(url({ walletAddress: 'nonsense' }), OPTIONS)).toThrow(UnsignableUrlError)
  })

  it('refuses the production host when we are in sandbox', () => {
    const live = url().replace('buy-sandbox.moonpay.com', 'buy.moonpay.com')
    expect(() => sanitizeBuyUrl(live, OPTIONS)).toThrow(UnsignableUrlError)
  })
})

describe('signBuyUrl', () => {
  it('signs exactly the query string it hands back', () => {
    const signed = new URL(signBuyUrl(url(), OPTIONS))
    const signature = signed.searchParams.get('signature')

    expect(signature).toBeTruthy()

    // What MoonPay will do on their side: strip the signature, hash the rest, compare.
    const query = signed.search.slice(0, signed.search.indexOf('&signature='))
    expect(createHmac('sha256', OPTIONS.secretKey).update(query).digest('base64')).toBe(signature)
  })

  it('escapes the signature, which is base64 and full of + / and =', () => {
    const signed = signBuyUrl(url(), OPTIONS)
    const raw = signed.slice(signed.indexOf('&signature=') + '&signature='.length)

    expect(raw).not.toMatch(/[+/=]/)
    expect(decodeURIComponent(raw)).toMatch(/[+/=]|^[A-Za-z0-9]+$/)
  })

  it('produces a different signature for a different amount', () => {
    expect(signBuyUrl(url({ baseCurrencyAmount: '20.00' }), OPTIONS))
      .not.toBe(signBuyUrl(url({ baseCurrencyAmount: '50.00' }), OPTIONS))
  })
})

describe('signQuery', () => {
  it('matches a hand-computed HMAC over the query string', () => {
    expect(signQuery('?a=1&b=2', 'secret'))
      .toBe(createHmac('sha256', 'secret').update('?a=1&b=2').digest('base64'))
  })
})
