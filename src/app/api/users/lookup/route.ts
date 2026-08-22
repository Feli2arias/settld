import type { NextRequest } from 'next/server'
import { findUserByUsername, findUserByWalletAddress } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { ValidationError, requireUsername, requireWalletAddress } from '@/lib/store/validate'

/**
 * Resuelve un usuario por `@usuario` o por wallet address. Devuelve null si no existe.
 *
 * La búsqueda por address es la que permite volver a entrar a una cuenta: el navegador
 * deriva la address de la frase de recuperación y pregunta acá de quién es. La frase
 * nunca sale del dispositivo.
 */
export const GET = (request: NextRequest) => handle(async () => {
  const { searchParams } = request.nextUrl

  const address = searchParams.get('address')
  if (address) return findUserByWalletAddress(requireWalletAddress(address))

  const username = searchParams.get('username')
  if (username) return findUserByUsername(requireUsername(username))

  throw new ValidationError('Falta el usuario o la address a buscar')
})
