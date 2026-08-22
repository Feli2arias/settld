import type { NextRequest } from 'next/server'
import { updateSettlement } from '@/lib/store/db'
import { fail, handle } from '@/lib/store/respond'
import { ValidationError, requireString } from '@/lib/store/validate'

const STATUSES = ['pending', 'confirmed', 'failed'] as const

/** Marks a payment confirmed (with its tx hash) or failed, once the network has answered. */
export const PATCH = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return handle(async () => {
    const body = await request.json()
    const status = requireString(body.status, 'the status', { max: 20 })

    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new ValidationError('Invalid status')
    }

    const updated = await updateSettlement(id, {
      status: status as (typeof STATUSES)[number],
      txHash: typeof body.txHash === 'string' ? body.txHash : undefined
    })

    if (!updated) throw new ValidationError("We couldn't find that payment")
    return updated
  })
}

export const GET = () => fail('Method not allowed', 405)
