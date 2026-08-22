import type { NextRequest } from 'next/server'
import { findUserByUsername, findUserByWalletAddress } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { ValidationError, requireUsername, requireWalletAddress } from '@/lib/store/validate'

/**
 * Resolves a user by `@username` or by wallet address. Returns null if there is none.
 *
 * The address lookup is what makes signing back in possible: the browser derives the
 * address from the recovery phrase and asks here whose it is. The phrase never leaves
 * the device.
 */
export const GET = (request: NextRequest) => handle(async () => {
  const { searchParams } = request.nextUrl

  const address = searchParams.get('address')
  if (address) return findUserByWalletAddress(requireWalletAddress(address))

  const username = searchParams.get('username')
  if (username) return findUserByUsername(requireUsername(username))

  throw new ValidationError('Missing the username or address to look up')
})
