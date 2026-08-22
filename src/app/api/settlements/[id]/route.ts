import type { NextRequest } from 'next/server'
import { updateSettlement } from '@/lib/store/db'
import { fail, handle } from '@/lib/store/respond'
import { ValidationError, requireString } from '@/lib/store/validate'

const STATUSES = ['pending', 'confirmed', 'failed'] as const

/** Marca un pago como confirmado (con su tx hash) o fallido, una vez que la red respondió. */
export const PATCH = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return handle(async () => {
    const body = await request.json()
    const status = requireString(body.status, 'el estado', { max: 20 })

    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new ValidationError('Estado inválido')
    }

    const updated = await updateSettlement(id, {
      status: status as (typeof STATUSES)[number],
      txHash: typeof body.txHash === 'string' ? body.txHash : undefined
    })

    if (!updated) throw new ValidationError('No encontramos ese pago')
    return updated
  })
}

export const GET = () => fail('Método no permitido', 405)
