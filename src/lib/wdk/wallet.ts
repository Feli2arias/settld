/**
 * Settld's wallet layer, built on WDK.
 *
 * All of this runs in the browser: the seed is generated on the user's device and never
 * sent to the server. Settld stores the public address (so others can pay them) and
 * nothing else.
 *
 * No function in this module may leak the seed or the keyPair to the rest of the app.
 */

import type { TransferResult } from '@tetherto/wdk-wallet-evm'
import { USDT_ADDRESS, WDK_CONFIG } from './config'
import { retryPreflight } from './errors'
import { centsToTokenUnits, tokenUnitsToCents } from './money'
import { currentBlock, waitForUserOp } from './receipt'

type WalletManager = InstanceType<typeof import('@tetherto/wdk-wallet-evm-erc-4337').default>
type Account = Awaited<ReturnType<WalletManager['getAccount']>>

/** WDK depends on Node APIs we only shim for the browser, so it is imported at runtime. */
async function loadWdk () {
  const [{ default: WDK }, { default: WalletManagerEvmErc4337 }] = await Promise.all([
    import('@tetherto/wdk'),
    import('@tetherto/wdk-wallet-evm-erc-4337')
  ])
  return { WDK, WalletManagerEvmErc4337 }
}

export async function generateSeedPhrase (): Promise<string> {
  const { WDK } = await loadWdk()
  return WDK.getRandomSeedPhrase()
}

/** Word counts BIP-39 accepts. WDK generates 12. */
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24]

/**
 * Cleans up a hand-typed phrase: extra spaces, line breaks and the capitals a phone
 * keyboard adds. Returns null if it doesn't even have the shape of a phrase.
 */
export function normalizeSeedPhrase (input: string): string | null {
  const words = input.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return VALID_WORD_COUNTS.includes(words.length) ? words.join(' ') : null
}

/**
 * Opens the account for a seed and hands it to `fn`, making sure the keys are wiped from
 * memory when it ends, whatever happens.
 *
 * It is the only door into the wallet: nobody outside this module touches an account.
 */
async function withAccount<T> (seedPhrase: string, fn: (account: Account) => Promise<T>): Promise<T> {
  const { WalletManagerEvmErc4337 } = await loadWdk()
  const wallet = new WalletManagerEvmErc4337(seedPhrase, WDK_CONFIG)
  const account = await wallet.getAccount(0)

  try {
    return await fn(account)
  } finally {
    account.dispose()
  }
}

/** Derives the smart account address. It is the only thing Settld publishes about a wallet. */
export const deriveAddress = (seedPhrase: string): Promise<string> =>
  withAccount(seedPhrase, account => account.getAddress())

/** Balance in cents, ready to display. */
export const getBalanceCents = (seedPhrase: string): Promise<number> =>
  withAccount(seedPhrase, async account =>
    tokenUnitsToCents(await account.getTokenBalance(USDT_ADDRESS))
  )

/** Balance of any address, without needing its seed. For seeing someone else's balance. */
export async function getBalanceCentsOf (address: string): Promise<number> {
  const { WalletAccountReadOnlyEvm } = await import('@tetherto/wdk-wallet-evm')
  const account = new WalletAccountReadOnlyEvm(address, { provider: WDK_CONFIG.provider })
  return tokenUnitsToCents(await account.getTokenBalance(USDT_ADDRESS))
}

export interface TransferPreview {
  amountCents: number
  /** Estimated network cost, in cents. Paid in USD₮, not ETH. */
  feeCents: number
  balanceCents: number
  balanceAfterCents: number
  hasEnough: boolean
}

/**
 * Simulates the transfer without executing it. This feeds the preview screen: the user
 * sees exactly what it costs and how their balance ends up before confirming anything.
 */
export function previewTransfer (seedPhrase: string, recipient: string, amountCents: number): Promise<TransferPreview> {
  return withAccount(seedPhrase, async account => {
    const amount = centsToTokenUnits(amountCents)

    // Quoting is read-only, so a rate-limited bundler is worth waiting out rather than
    // throwing the preview screen away.
    const [balance, quote] = await Promise.all([
      account.getTokenBalance(USDT_ADDRESS),
      retryPreflight(() => account.quoteTransfer({ token: USDT_ADDRESS, recipient, amount }))
    ])

    const balanceCents = tokenUnitsToCents(balance)
    const feeCents = tokenUnitsToCents(BigInt(quote.fee))
    const totalCents = amountCents + feeCents

    return {
      amountCents,
      feeCents,
      balanceCents,
      balanceAfterCents: balanceCents - totalCents,
      hasEnough: balanceCents >= totalCents
    }
  })
}

export interface TransferReceipt {
  userOpHash: string
  txHash: string | null
  success: boolean
}

/**
 * Actually executes the transfer and waits for on-chain confirmation.
 *
 * Two details that cost blood:
 *
 * 1. `transfer()` returns the UserOperation hash, which is NOT the transaction hash. The
 *    explorer link needs the second one, and we get it from the event the EntryPoint
 *    emits (see receipt.ts).
 * 2. Once `transfer()` has returned, the money is ALREADY on its way. From that point on
 *    no error may be reported as "the payment failed": the worst that can happen is that
 *    we don't know yet whether it arrived. That's why `onSubmitted` runs before waiting,
 *    so the caller can put the payment on record whatever happens next.
 *
 * The same rule governs the retry below: we only try again while the failure proves
 * nothing was sent.
 */
export function sendTransfer (
  seedPhrase: string,
  recipient: string,
  amountCents: number,
  onSubmitted?: (userOpHash: string) => Promise<void> | void
): Promise<TransferReceipt> {
  return withAccount(seedPhrase, async account => {
    // We note the current block before sending, so we can then search for the event
    // from here instead of sweeping the whole chain.
    const fromBlock = await currentBlock().catch(() => 'latest')

    // The retry only fires while the error proves the operation never left — a failed
    // pricing call. Anything from `eth_sendUserOperation` onwards throws straight through:
    // repeating it could pay somebody twice, which is far worse than failing.
    const result: TransferResult = await retryPreflight(() => account.transfer({
      token: USDT_ADDRESS,
      recipient,
      amount: centsToTokenUnits(amountCents)
    }))

    await onSubmitted?.(result.hash)

    const outcome = await waitForUserOp(result.hash, fromBlock)

    return {
      userOpHash: result.hash,
      txHash: outcome?.txHash ?? null,
      success: outcome?.success ?? false
    }
  })
}
