/**
 * Turning infrastructure failures into sentences a person can act on.
 *
 * The public bundler is rate limited, and when it refuses a call WDK throws things like
 * `sendRPCRequest(pimlico_getUserOperationGasPrice) failed`. Showing that to somebody who
 * is trying to pay their friend back is a bug twice over: it means nothing to them, and it
 * puts the words "RPC" and "gas" on a screen that has spent the whole app avoiding them.
 *
 * So nothing thrown by the wallet layer ever reaches the interface unread.
 */

/**
 * Calls the bundler makes to price a UserOperation, before anything is signed or sent.
 *
 * This distinction is the whole reason this file is careful: if one of these fails, no
 * money has moved and the operation can simply be tried again. Anything at or after
 * `eth_sendUserOperation` must never be retried automatically — repeating it could pay
 * somebody twice.
 */
const PREFLIGHT = /getUserOperationGasPrice|estimateUserOperationGas/i

/** The bundler or the node refused or dropped the call. Almost always the rate limit. */
const UNREACHABLE = /sendRPCRequest|rate limit|429|too many requests|fetch failed|failed to fetch|network ?error|timeout|ETIMEDOUT|ECONNRESET/i

const OVER_FEE_CAP = /maximum fee cost|transferMaxFee|exceeded maximum fee/i

const NOT_ENOUGH = /insufficient|not enough|exceeds balance/i

const messageOf = (err: unknown) =>
  err instanceof Error ? err.message : typeof err === 'string' ? err : ''

/** True when the failure happened before anything was signed, so retrying is safe. */
export const isPreflightFailure = (err: unknown) => PREFLIGHT.test(messageOf(err))

/**
 * What to put on screen.
 *
 * `fallback` is what the caller would have said anyway, and it's used whenever the error
 * isn't one we recognise — that way a real message of ours ("That username is taken")
 * still gets through, and a raw one from a library never does.
 */
export function describeWalletError (err: unknown, fallback: string): string {
  const message = messageOf(err)
  if (!message) return fallback

  if (OVER_FEE_CAP.test(message)) {
    return 'The network is charging more than we allow for a single payment right now. Try again in a few minutes.'
  }

  if (NOT_ENOUGH.test(message)) {
    return "You don't have enough in your balance to cover this."
  }

  if (PREFLIGHT.test(message) || UNREACHABLE.test(message)) {
    return 'The payment network is busy right now. Wait a few seconds and try again.'
  }

  // Anything with the shape of a library error — parentheses, camelCase methods, hex —
  // is ours to swallow. If it reads like a sentence, it is probably one of our own.
  return /[(){}]|0x[0-9a-f]{6,}|[a-z]+_[a-zA-Z]+/.test(message) ? fallback : message
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Retries an operation, but only while it is failing in a way that proves nothing was
 * sent. One rate-limited pricing call shouldn't cost somebody their payment.
 */
export async function retryPreflight<T> (
  operation: () => Promise<T>,
  { attempts = 3, delayMs = 500 }: { attempts?: number, delayMs?: number } = {}
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation()
    } catch (err) {
      if (attempt >= attempts || !isPreflightFailure(err)) throw err
      await sleep(delayMs * attempt)
    }
  }
}
