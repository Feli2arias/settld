import type { NextRequest } from 'next/server'
import { createExpense, findGroup } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { ValidationError, requirePositiveCents, requireString, requireStringArray } from '@/lib/store/validate'

export const POST = (request: NextRequest) => handle(async () => {
  const body = await request.json()

  const groupId = requireString(body.groupId, 'el grupo')
  const paidBy = requireString(body.paidBy, 'quién pagó')
  const splitBetween = requireStringArray(body.splitBetween, 'entre quiénes se divide')

  // Un gasto sólo tiene sentido si todos los involucrados están en el grupo.
  const group = await findGroup(groupId)
  if (!group) throw new ValidationError('No encontramos ese grupo')

  const outsiders = [paidBy, ...splitBetween].filter(id => !group.memberIds.includes(id))
  if (outsiders.length > 0) throw new ValidationError('Hay alguien que no es miembro del grupo')

  return createExpense({
    groupId,
    description: requireString(body.description, 'la descripción', { max: 80 }),
    amountCents: requirePositiveCents(body.amountCents, 'el monto'),
    paidBy,
    splitBetween
  })
})
