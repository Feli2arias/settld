import type { NextRequest } from 'next/server'
import { deleteSettld, updateSettld } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { ValidationError, requirePositiveCents, requireString, requireStringArray } from '@/lib/store/validate'

/**
 * Changing or removing a settld.
 *
 * Both check that the caller is the one who paid. That check lives in the store rather
 * than here, so it cannot be skipped by whoever adds the next route.
 */
export async function PATCH (request: NextRequest, { params }: RouteContext<'/api/settlds/[id]'>) {
  return handle(async () => {
    const { id } = await params
    const body = await request.json()
    const userId = requireString(body.userId, 'the user')

    const patch: Parameters<typeof updateSettld>[2] = {}

    if (body.description !== undefined) patch.description = requireString(body.description, 'the description')
    if (body.amountCents !== undefined) patch.amountCents = requirePositiveCents(body.amountCents, 'the amount')

    if (body.splitBetween !== undefined) {
      const splitBetween = requireStringArray(body.splitBetween, 'the people')
      if (splitBetween.length < 2) throw new ValidationError('A settld needs at least two people')
      patch.splitBetween = [...new Set(splitBetween)]
    }

    return updateSettld(id, userId, patch)
  })
}

export async function DELETE (request: NextRequest, { params }: RouteContext<'/api/settlds/[id]'>) {
  return handle(async () => {
    const { id } = await params
    const userId = requireString(request.nextUrl.searchParams.get('userId'), 'the user')

    await deleteSettld(id, userId)
    return { id }
  })
}
