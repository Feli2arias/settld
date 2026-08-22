/**
 * Signing the MoonPay checkout URL.
 *
 * MoonPay refuses a widget URL it can't attribute — "We couldn't validate the signature
 * sent from the partner environment" — because otherwise anyone could hand a stranger a
 * link that charges a card and sends the coins to their own address, under our name.
 *
 * The signature is an HMAC of the query string with our secret key, so the secret must
 * never reach the browser. Everything here runs on the server, behind /api/onramp/sign.
 */

import { createHmac } from 'node:crypto'

const BUY_HOSTS = {
  production: 'buy.moonpay.com',
  sandbox: 'buy-sandbox.moonpay.com'
} as const

export type MoonPayEnvironment = keyof typeof BUY_HOSTS

/**
 * The only parameters we will put our name to, in the order they get signed.
 *
 * Rebuilding the query from this list rather than signing whatever arrives is the whole
 * security of this route: without it we'd be a free signing service for anybody who wants
 * to run purchases through our MoonPay account with their own wallet address.
 */
const ALLOWED = [
  'apiKey',
  'currencyCode',
  'baseCurrencyCode',
  'baseCurrencyAmount',
  'quoteCurrencyAmount',
  'walletAddress',
  'colorCode',
  'theme',
  'language',
  'redirectURL'
] as const

export class UnsignableUrlError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'UnsignableUrlError'
  }
}

const ADDRESS = /^0x[0-9a-fA-F]{40}$/

/**
 * Rebuilds the checkout URL from what we recognise, and refuses anything that isn't a
 * MoonPay buy link for our own account.
 */
export function sanitizeBuyUrl (
  rawUrl: string,
  { apiKey, environment, redirectOrigin }: { apiKey: string, environment: MoonPayEnvironment, redirectOrigin: string }
): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new UnsignableUrlError('That is not a checkout link')
  }

  if (parsed.protocol !== 'https:' || parsed.host !== BUY_HOSTS[environment]) {
    throw new UnsignableUrlError('That is not a checkout link')
  }

  if (parsed.searchParams.get('apiKey') !== apiKey) {
    throw new UnsignableUrlError('That checkout belongs to another account')
  }

  const wallet = parsed.searchParams.get('walletAddress')
  if (!wallet || !ADDRESS.test(wallet)) {
    throw new UnsignableUrlError('That checkout has no valid destination')
  }

  const clean = new URL(`https://${BUY_HOSTS[environment]}/`)

  for (const key of ALLOWED) {
    const value = parsed.searchParams.get(key)
    if (value === null) continue

    // Wherever the buyer is sent afterwards is ours to decide, not the caller's.
    clean.searchParams.append(key, key === 'redirectURL' ? `${redirectOrigin}/home` : value)
  }

  return clean
}

/** The HMAC MoonPay expects: base64 of SHA-256 over the query string, `?` included. */
export const signQuery = (search: string, secretKey: string): string =>
  createHmac('sha256', secretKey).update(search).digest('base64')

/** A checkout URL MoonPay will accept. Throws if the input isn't one of ours. */
export function signBuyUrl (
  rawUrl: string,
  options: { apiKey: string, secretKey: string, environment: MoonPayEnvironment, redirectOrigin: string }
): string {
  const url = sanitizeBuyUrl(rawUrl, options)
  const signature = signQuery(url.search, options.secretKey)

  // Appended by hand: the signature covers the query string exactly as it stands now, so
  // it cannot be part of what gets signed.
  return `${url.toString()}&signature=${encodeURIComponent(signature)}`
}
