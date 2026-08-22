import type { NextRequest } from 'next/server'
import { findVaultByUsername } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requireUsername } from '@/lib/store/validate'

/**
 * Entrega el bulto cifrado de una cuenta para que el navegador intente abrirlo.
 *
 * Sin la contraseña del usuario esto no sirve de nada: la contraseña nunca llega
 * al servidor y el descifrado ocurre entero en el dispositivo.
 *
 * Devuelve null si la cuenta no existe o si es de las viejas, creadas antes de que
 * hubiera contraseñas. En ese caso el único camino es la frase de recuperación.
 */
export const GET = (request: NextRequest) => handle(async () => {
  const username = requireUsername(request.nextUrl.searchParams.get('username'))
  return findVaultByUsername(username)
})
