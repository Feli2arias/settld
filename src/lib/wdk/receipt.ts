/**
 * Cómo Split se entera de que un pago realmente ocurrió.
 *
 * El camino obvio es preguntarle al bundler, pero el bundler público tiene rate limit
 * y falla justo cuando más importa. Así que vamos a la fuente de verdad: el contrato
 * EntryPoint de ERC-4337 emite un evento por cada operación ejecutada, y ese evento
 * vive en la blockchain, donde nadie nos lo puede negar.
 *
 * De ahí sacamos las dos cosas que necesitamos: si la operación salió bien, y el hash
 * de la transacción real —que no es el mismo que el hash de la operación— para poder
 * linkear al explorer.
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
  if (payload.error) throw new Error(payload.error.message ?? 'Error del nodo')

  return payload.result as T
}

export const currentBlock = () => rpc<string>('eth_blockNumber', [])

export interface UserOpOutcome {
  txHash: string
  success: boolean
}

/**
 * El campo `data` del evento son cuatro palabras de 32 bytes:
 * nonce | success | actualGasCost | actualGasUsed. La que nos importa es la segunda.
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
 * Espera a que la operación aparezca en la blockchain.
 *
 * Devuelve `null` si se acabó el tiempo. Ojo: eso NO significa que el pago falló,
 * significa que todavía no lo vimos. Quien llama tiene que tratarlo como "pendiente".
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
      // Un nodo que se cae no es una respuesta: reintentamos hasta que se acabe el tiempo.
    }

    await sleep(3000)
  }

  return null
}
