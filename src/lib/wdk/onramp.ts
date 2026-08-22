/**
 * Comprar saldo con tarjeta, usando el módulo de MoonPay de WDK.
 *
 * MoonPay no mueve la plata desde acá: `buy()` arma la URL del widget y el usuario
 * completa la compra ahí, con su tarjeta, como en cualquier checkout. Los fondos
 * caen directo en su wallet.
 *
 * Le pasamos el tema de Split para que el widget no se sienta una app ajena.
 */

import { MOONPAY_API_KEY, MOONPAY_ASSET, MOONPAY_ENVIRONMENT, WDK_CONFIG } from './config'

/** El on-ramp sólo se ofrece si hay clave configurada. */
export const isOnrampAvailable = () => Boolean(MOONPAY_API_KEY)

/**
 * Arma la URL del checkout para una address.
 *
 * Usa una cuenta de sólo lectura a propósito: para generar un link de compra alcanza
 * con saber a dónde mandar los fondos, no hace falta abrir la wallet del usuario.
 */
export async function buildBuyUrl (address: string, amountCents: number): Promise<string> {
  if (!MOONPAY_API_KEY) throw new Error('El pago con tarjeta no está configurado')

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
