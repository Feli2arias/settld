/**
 * La capa de wallet de Settld, construida sobre WDK.
 *
 * Todo esto corre en el navegador: la seed se genera en el dispositivo del usuario y
 * nunca se manda al servidor. Settld guarda la address pública (para que otros puedan
 * pagarle) y nada más.
 *
 * Ninguna función de este módulo debe filtrar la seed ni el keyPair al resto de la app.
 */

import type { TransferResult } from '@tetherto/wdk-wallet-evm'
import { USDT_ADDRESS, WDK_CONFIG } from './config'
import { centsToTokenUnits, tokenUnitsToCents } from './money'
import { currentBlock, waitForUserOp } from './receipt'

type WalletManager = InstanceType<typeof import('@tetherto/wdk-wallet-evm-erc-4337').default>
type Account = Awaited<ReturnType<WalletManager['getAccount']>>

/** WDK depende de APIs de Node que sólo shimeamos para el browser, así que se importa en runtime. */
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

/** Cantidades de palabras que admite BIP-39. WDK genera de 12. */
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24]

/**
 * Limpia una frase tipeada a mano: espacios de más, saltos de línea y mayúsculas
 * que mete el teclado del celular. Devuelve null si ni siquiera tiene forma de frase.
 */
export function normalizeSeedPhrase (input: string): string | null {
  const words = input.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return VALID_WORD_COUNTS.includes(words.length) ? words.join(' ') : null
}

/**
 * Abre la cuenta de una seed y se la pasa a `fn`, asegurando que las claves se borren
 * de memoria al terminar, pase lo que pase.
 *
 * Es la única puerta de entrada a la wallet: nadie fuera de este módulo toca un account.
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

/** Deriva la address de la smart account. Es lo único que Settld publica de una wallet. */
export const deriveAddress = (seedPhrase: string): Promise<string> =>
  withAccount(seedPhrase, account => account.getAddress())

/** Saldo en centavos, listo para mostrar. */
export const getBalanceCents = (seedPhrase: string): Promise<number> =>
  withAccount(seedPhrase, async account =>
    tokenUnitsToCents(await account.getTokenBalance(USDT_ADDRESS))
  )

/** Saldo de cualquier address, sin necesidad de su seed. Para ver el balance de otro. */
export async function getBalanceCentsOf (address: string): Promise<number> {
  const { WalletAccountReadOnlyEvm } = await import('@tetherto/wdk-wallet-evm')
  const account = new WalletAccountReadOnlyEvm(address, { provider: WDK_CONFIG.provider })
  return tokenUnitsToCents(await account.getTokenBalance(USDT_ADDRESS))
}

export interface TransferPreview {
  amountCents: number
  /** Costo estimado de red, en centavos. Se paga en USD₮, no en ETH. */
  feeCents: number
  balanceCents: number
  balanceAfterCents: number
  hasEnough: boolean
}

/**
 * Simula la transferencia sin ejecutarla. Alimenta la pantalla de preview: el usuario
 * ve exactamente cuánto sale y cómo le queda el saldo antes de confirmar nada.
 */
export function previewTransfer (seedPhrase: string, recipient: string, amountCents: number): Promise<TransferPreview> {
  return withAccount(seedPhrase, async account => {
    const amount = centsToTokenUnits(amountCents)

    const [balance, quote] = await Promise.all([
      account.getTokenBalance(USDT_ADDRESS),
      account.quoteTransfer({ token: USDT_ADDRESS, recipient, amount })
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
 * Ejecuta la transferencia de verdad y espera la confirmación on-chain.
 *
 * Dos detalles que costaron sangre:
 *
 * 1. `transfer()` devuelve el hash de la UserOperation, que NO es el hash de la
 *    transacción. El link al explorer necesita el segundo, y lo sacamos del evento
 *    que emite el EntryPoint (ver receipt.ts).
 * 2. Una vez que `transfer()` volvió, la plata YA está en camino. A partir de ahí
 *    ningún error puede reportarse como "el pago falló": lo peor que puede pasar es
 *    que todavía no sepamos si llegó. Por eso `onSubmitted` corre antes de esperar,
 *    para que quien llama pueda dejar constancia del pago pase lo que pase después.
 */
export function sendTransfer (
  seedPhrase: string,
  recipient: string,
  amountCents: number,
  onSubmitted?: (userOpHash: string) => Promise<void> | void
): Promise<TransferReceipt> {
  return withAccount(seedPhrase, async account => {
    // Anotamos el bloque actual antes de enviar, para después buscar el evento
    // desde acá y no barrer toda la cadena.
    const fromBlock = await currentBlock().catch(() => 'latest')

    const result: TransferResult = await account.transfer({
      token: USDT_ADDRESS,
      recipient,
      amount: centsToTokenUnits(amountCents)
    })

    await onSubmitted?.(result.hash)

    const outcome = await waitForUserOp(result.hash, fromBlock)

    return {
      userOpHash: result.hash,
      txHash: outcome?.txHash ?? null,
      success: outcome?.success ?? false
    }
  })
}
