import type { NextRequest } from 'next/server'
import { fail, handle } from '@/lib/store/respond'
import { requireWalletAddress } from '@/lib/store/validate'
import { USDT_ADDRESS, WDK_CONFIG } from '@/lib/wdk/config'
import { centsToTokenUnits } from '@/lib/wdk/money'

/**
 * The "test funds" option behind the Add money button.
 *
 * In a real app this would be a fiat on-ramp. We run on a testnet, so Settld keeps a
 * treasury account topped up from a faucet that sends test USD₮ to whoever asks. It's
 * what lets anyone open the app and have a balance without going through a captcha faucet.
 *
 * Testnet only. If this ever goes to mainnet, this route gets deleted.
 */

export const runtime = 'nodejs'

/**
 * Sending the transfer and waiting for confirmation can take far longer than a normal
 * request. Without this headroom, the function would be cut off halfway.
 */
export const maxDuration = 60

const GRANT_CENTS = 5_000 // $50 of test money per request: plenty, and the treasury lasts twice as long

export async function POST (request: NextRequest) {
  const seedPhrase = process.env.TREASURY_SEED_PHRASE

  if (!seedPhrase) {
    return fail('The treasury is not configured. TREASURY_SEED_PHRASE is missing.', 503)
  }

  return handle(async () => {
    const body = await request.json()
    const recipient = requireWalletAddress(body.address, 'the wallet')

    const { default: WalletManagerEvmErc4337 } = await import('@tetherto/wdk-wallet-evm-erc-4337')
    const wallet = new WalletManagerEvmErc4337(seedPhrase, WDK_CONFIG)
    const account = await wallet.getAccount(0)

    try {
      const amount = centsToTokenUnits(GRANT_CENTS)

      const available = await account.getTokenBalance(USDT_ADDRESS)
      if (available < amount) {
        throw new Error('The treasury has run out of test USD₮')
      }

      const result = await account.transfer({ token: USDT_ADDRESS, recipient, amount })

      // Waiting for confirmation is desirable, but it is no reason to report an error:
      // once the transfer is out, the money is on its way even if the public bundler
      // leaves us hanging with a rate limit.
      await account
        .waitForTransaction(result.hash, { target: 'confirmed', timeout: 90_000 })
        .catch(() => null)

      return { grantedCents: GRANT_CENTS }
    } finally {
      account.dispose()
    }
  })
}
