import type { NextRequest } from 'next/server'
import { createUser, listUsers } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requireString, requireUsername, requireVault, requireWalletAddress } from '@/lib/store/validate'

export const GET = () => handle(listUsers)

export const POST = (request: NextRequest) => handle(async () => {
  const body = await request.json()

  return createUser({
    name: requireString(body.name, 'el nombre', { max: 60 }),
    username: requireUsername(body.username),
    // La wallet la crea el browser: acá sólo recibimos y validamos la address pública.
    walletAddress: requireWalletAddress(body.walletAddress),
    // Y el bulto cifrado con su contraseña, que el servidor no puede abrir.
    vault: requireVault(body.vault)
  })
})
