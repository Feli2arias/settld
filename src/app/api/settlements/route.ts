import type { NextRequest } from 'next/server'
import { createSettlement } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requirePositiveCents, requireString } from '@/lib/store/validate'

/**
 * Registra un pago recién enviado a la red, en estado `pending`.
 *
 * El pago se ejecuta desde la wallet del usuario en el browser; el servidor sólo anota
 * que ocurrió. Hasta que se confirme on-chain, la deuda sigue contando como impaga.
 */
export const POST = (request: NextRequest) => handle(async () => {
  const body = await request.json()

  return createSettlement({
    groupId: requireString(body.groupId, 'el grupo'),
    from: requireString(body.from, 'quién paga'),
    to: requireString(body.to, 'a quién le paga'),
    amountCents: requirePositiveCents(body.amountCents, 'el monto'),
    userOpHash: requireString(body.userOpHash, 'el hash de la operación', { max: 80 })
  })
})
