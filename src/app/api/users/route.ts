import type { NextRequest } from 'next/server'
import { createUser, listUsers } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requireString, requireUsername, requireVault, requireWalletAddress } from '@/lib/store/validate'

export const GET = () => handle(listUsers)

export const POST = (request: NextRequest) => handle(async () => {
  const body = await request.json()

  return createUser({
    name: requireString(body.name, 'the name', { max: 60 }),
    username: requireUsername(body.username),
    // The browser creates the wallet: here we only receive and validate the public address.
    walletAddress: requireWalletAddress(body.walletAddress),
    // And the bundle encrypted with their password, which the server cannot open.
    vault: requireVault(body.vault)
  })
})
