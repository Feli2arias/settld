import type { NextRequest } from 'next/server'
import { fail, handle } from '@/lib/store/respond'
import { requireWalletAddress } from '@/lib/store/validate'
import { USDT_ADDRESS, WDK_CONFIG } from '@/lib/wdk/config'
import { centsToTokenUnits } from '@/lib/wdk/money'

/**
 * El botón "Cargar saldo".
 *
 * En una app real esto sería un on-ramp de fiat. Acá corremos sobre testnet, así que
 * Settld tiene una cuenta de tesorería cargada desde un faucet que le manda USD₮ de
 * prueba a quien lo pide. Es lo que permite que cualquiera abra la app y tenga saldo
 * sin pasar por un faucet con captcha.
 *
 * Sólo existe en testnet. Si algún día esto va a mainnet, esta ruta se borra.
 */

export const runtime = 'nodejs'

/**
 * Mandar la transferencia y esperar que confirme puede tardar bastante más que un
 * request normal. Sin este margen, la función se cortaría a mitad de camino.
 */
export const maxDuration = 60

const GRANT_CENTS = 5_000 // $50 de prueba por pedido: alcanza de sobra y el treasury rinde el doble

export async function POST (request: NextRequest) {
  const seedPhrase = process.env.TREASURY_SEED_PHRASE

  if (!seedPhrase) {
    return fail('La tesorería no está configurada. Falta TREASURY_SEED_PHRASE.', 503)
  }

  return handle(async () => {
    const body = await request.json()
    const recipient = requireWalletAddress(body.address, 'la wallet')

    const { default: WalletManagerEvmErc4337 } = await import('@tetherto/wdk-wallet-evm-erc-4337')
    const wallet = new WalletManagerEvmErc4337(seedPhrase, WDK_CONFIG)
    const account = await wallet.getAccount(0)

    try {
      const amount = centsToTokenUnits(GRANT_CENTS)

      const available = await account.getTokenBalance(USDT_ADDRESS)
      if (available < amount) {
        throw new Error('La tesorería se quedó sin USD₮ de prueba')
      }

      const result = await account.transfer({ token: USDT_ADDRESS, recipient, amount })

      // Esperar la confirmación es deseable, pero no es motivo para reportar un error:
      // una vez que la transferencia salió, la plata está en camino aunque el bundler
      // público nos deje colgados con un rate limit.
      await account
        .waitForTransaction(result.hash, { target: 'confirmed', timeout: 90_000 })
        .catch(() => null)

      return { grantedCents: GRANT_CENTS }
    } finally {
      account.dispose()
    }
  })
}
