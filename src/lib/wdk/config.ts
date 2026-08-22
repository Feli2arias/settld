/**
 * Settld's network configuration.
 *
 * We run on Ethereum Sepolia with test USD₮, and use ERC-4337 with a paymaster so gas is
 * paid in that same USD₮. Important consequence: no user ever needs to hold ETH. They
 * create an account, receive USD₮, and can pay right away.
 */

export const CHAIN_ID = 11155111

/**
 * The RPC listed in WDK's docs (sepolia.drpc.org) stopped serving Sepolia on the free
 * plan, so we use publicnode.
 */
export const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

/** Test USD₮ on Sepolia. 6 decimals. Worth nothing at all. */
export const USDT_ADDRESS = '0xd077a400968890eacc75cdc901f0356c943e4fdb'
export const USDT_DECIMALS = 6

/**
 * ERC-4337 bundler and paymaster.
 *
 * Pimlico's public endpoint is enough for development, but it is rate limited and starts
 * refusing queries exactly when there's activity. For a live demo, put a free API key in
 * NEXT_PUBLIC_BUNDLER_URL.
 */
const BUNDLER_URL =
  process.env.NEXT_PUBLIC_BUNDLER_URL ?? 'https://public.pimlico.io/v2/11155111/rpc'

/**
 * Fee ceiling per transfer, in USD₮ units.
 *
 * Each account's first transfer includes deploying the smart account and costs quite a
 * bit more than the ones after it (we measured ~1.7 USD₮ on Sepolia). We leave headroom,
 * but the limit exists: if the network spikes, WDK aborts instead of draining the wallet.
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

/**
 * Card on-ramp (MoonPay, via WDK).
 *
 * Without the publishable key, the buy-with-card option isn't offered: we would rather
 * hide it than show a button that leads nowhere.
 */
export const MOONPAY_API_KEY = process.env.NEXT_PUBLIC_MOONPAY_API_KEY ?? null

/** In sandbox, MoonPay simulates the whole purchase without charging a cent. */
export const MOONPAY_ENVIRONMENT =
  (process.env.NEXT_PUBLIC_MOONPAY_ENVIRONMENT as 'sandbox' | 'production' | undefined) ?? 'sandbox'

/** What gets bought. MoonPay identifies it with its own asset code. */
export const MOONPAY_ASSET = process.env.NEXT_PUBLIC_MOONPAY_ASSET ?? 'usdt'

export { BUNDLER_URL }
