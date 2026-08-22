/**
 * Configuración de red de Split.
 *
 * Corremos sobre Ethereum Sepolia con USD₮ de prueba, y usamos ERC-4337 con paymaster
 * para que el gas se pague en el mismo USD₮. Consecuencia importante: ningún usuario
 * necesita tener ETH jamás. Crea la cuenta, recibe USD₮, y ya puede pagar.
 */

export const CHAIN_ID = 11155111

/**
 * El RPC que figura en los docs de WDK (sepolia.drpc.org) dejó de servir Sepolia en el
 * plan gratuito, así que usamos publicnode.
 */
export const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

/** USD₮ de prueba en Sepolia. 6 decimales. No tiene ningún valor real. */
export const USDT_ADDRESS = '0xd077a400968890eacc75cdc901f0356c943e4fdb'
export const USDT_DECIMALS = 6

/**
 * Bundler y paymaster de ERC-4337.
 *
 * El endpoint público de Pimlico alcanza para desarrollar, pero tiene rate limit y
 * empieza a rechazar consultas justo cuando hay actividad. Para una demo en vivo
 * conviene poner una API key gratuita en NEXT_PUBLIC_BUNDLER_URL.
 */
const BUNDLER_URL =
  process.env.NEXT_PUBLIC_BUNDLER_URL ?? 'https://public.pimlico.io/v2/11155111/rpc'

/**
 * Techo de fee por transferencia, en unidades de USD₮.
 *
 * La primera transferencia de cada cuenta incluye el deploy de la smart account y sale
 * bastante más cara que las siguientes (medimos ~1.7 USD₮ en Sepolia). Dejamos margen,
 * pero el límite existe: si la red se dispara, WDK aborta en vez de vaciar la wallet.
 */
export const TRANSFER_MAX_FEE = 10_000_000 // 10 USD₮

export const WDK_CONFIG = {
  chainId: CHAIN_ID,
  provider: RPC_URL,
  bundlerUrl: BUNDLER_URL,
  paymasterUrl: BUNDLER_URL,
  paymasterAddress: '0x777777777777AeC03fd955926DbF81597e66834C',
  safeModulesVersion: '0.3.0',
  paymasterToken: { address: USDT_ADDRESS },
  transferMaxFee: TRANSFER_MAX_FEE
} as const

export const explorerTxUrl = (txHash: string) => `https://sepolia.etherscan.io/tx/${txHash}`

export { BUNDLER_URL }
