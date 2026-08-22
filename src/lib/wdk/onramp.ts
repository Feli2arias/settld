/**
 * Buying balance with a card, using WDK's MoonPay module.
 *
 * MoonPay doesn't move the money from here: `buy()` assembles the widget URL and the user
 * completes the purchase there, with their card, like any checkout. The funds land
 * straight in their wallet.
 *
 * We pass Settld's theme through so the widget doesn't feel like somebody else's app.
 */

import { MOONPAY_API_KEY, MOONPAY_ASSET, MOONPAY_ENVIRONMENT, WDK_CONFIG } from './config'

/** The on-ramp is only offered when a key is configured. */
export const isOnrampAvailable = () => Boolean(MOONPAY_API_KEY)

/**
 * Builds the checkout URL for an address.
 *
 * Uses a read-only account on purpose: generating a purchase link only requires knowing
 * where to send the funds, there's no need to open the user's wallet.
 */
export async function buildBuyUrl (address: string, amountCents: number): Promise<string> {
  if (!MOONPAY_API_KEY) throw new Error('Card payments are not configured')

  const [{ WalletAccountReadOnlyEvm }, { default: MoonPayProtocol }] = await Promise.all([
    import('@tetherto/wdk-wallet-evm'),
    import('@tetherto/wdk-protocol-fiat-moonpay')
  ])

  const account = new WalletAccountReadOnlyEvm(address, { provider: WDK_CONFIG.provider })

  const moonpay = new MoonPayProtocol(account, {
    apiKey: MOONPAY_API_KEY,
    environment: MOONPAY_ENVIRONMENT
  })

  const { buyUrl } = await moonpay.buy({
    cryptoAsset: MOONPAY_ASSET,
    fiatCurrency: 'usd',
    // MoonPay habla en centavos, igual que nosotros.
    fiatAmount: BigInt(Math.round(amountCents)),
    config: {
      colorCode: '#9fe870',
      theme: 'light',
      language: 'es',
      redirectURL: typeof window !== 'undefined' ? `${window.location.origin}/home` : undefined
    }
  })

  return buyUrl
}
