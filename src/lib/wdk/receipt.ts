/**
 * How Settld finds out that a payment actually happened.
 *
 * The obvious route is to ask the bundler, but the public bundler is rate limited and
 * fails exactly when it matters most. So we go to the source of truth: the ERC-4337
 * EntryPoint contract emits an event for every executed operation, and that event lives
 * on the blockchain, where nobody can deny it to us.
 *
 * From it we get the two things we need: whether the operation succeeded, and the real
 * transaction hash — which is not the same as the operation hash — so we can link to
 * the explorer.
 */

import { RPC_URL } from './config'

const ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'

/** keccak256("UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)") */
const USER_OPERATION_EVENT = '0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f'

const WORD = 64

interface RpcLog {
  data: string
  transactionHash: string
}

async function rpc<T> (method: string, params: unknown[]): Promise<T> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })

  const payload = await response.json()
  if (payload.error) throw new Error(payload.error.message ?? 'Node error')

  return payload.result as T
}

export const currentBlock = () => rpc<string>('eth_blockNumber', [])

export interface UserOpOutcome {
  txHash: string
  success: boolean
}

/**
 * The event's `data` field is four 32-byte words:
 * nonce | success | actualGasCost | actualGasUsed. The one we care about is the second.
 */
export function decodeSuccess (data: string): boolean {
  const body = data.replace(/^0x/, '')
  const word = body.slice(WORD, WORD * 2)

  if (word.length < WORD) return false
  return BigInt(`0x${word}`) === BigInt(1)
}

async function findUserOp (userOpHash: string, fromBlock: string): Promise<UserOpOutcome | null> {
  const logs = await rpc<RpcLog[]>('eth_getLogs', [{
    address: ENTRY_POINT,
    topics: [USER_OPERATION_EVENT, userOpHash],
    fromBlock,
    toBlock: 'latest'
  }])

  const [log] = logs
  if (!log) return null

  return { txHash: log.transactionHash, success: decodeSuccess(log.data) }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Waits for the operation to show up on the blockchain.
 *
 * Returns `null` if time ran out. Careful: that does NOT mean the payment failed, it
 * means we haven't seen it yet. The caller has to treat it as "pending".
 */
export async function waitForUserOp (
  userOpHash: string,
  fromBlock: string,
  timeoutMs = 120_000
): Promise<UserOpOutcome | null> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const outcome = await findUserOp(userOpHash, fromBlock)
      if (outcome) return outcome
    } catch {
      // A node going down is not an answer: we retry until time runs out.
    }

    await sleep(3000)
  }

  return null
}
