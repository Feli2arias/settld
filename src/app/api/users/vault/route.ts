import type { NextRequest } from 'next/server'
import { findVaultByUsername } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requireUsername } from '@/lib/store/validate'

/**
 * Hands over an account's encrypted bundle so the browser can try to open it.
 *
 * Without the user's password this is worthless: the password never reaches the server
 * and decryption happens entirely on the device.
 *
 * Returns null if the account doesn't exist, or if it's one of the old ones created
 * before passwords existed. In that case the only route is the recovery phrase.
 */
export const GET = (request: NextRequest) => handle(async () => {
  const username = requireUsername(request.nextUrl.searchParams.get('username'))
  return findVaultByUsername(username)
})
