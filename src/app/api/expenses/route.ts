import type { NextRequest } from 'next/server'
import { createExpense, findGroup } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { ValidationError, requirePositiveCents, requireString, requireStringArray } from '@/lib/store/validate'

export const POST = (request: NextRequest) => handle(async () => {
  const body = await request.json()

  const groupId = requireString(body.groupId, 'the group')
  const paidBy = requireString(body.paidBy, 'who paid')
  const splitBetween = requireStringArray(body.splitBetween, 'who it is split between')

  // An expense only makes sense if everyone involved is in the group.
  const group = await findGroup(groupId)
  if (!group) throw new ValidationError("We couldn't find that group")

  const outsiders = [paidBy, ...splitBetween].filter(id => !group.memberIds.includes(id))
  if (outsiders.length > 0) throw new ValidationError('Someone here is not a member of the group')

  return createExpense({
    groupId,
    description: requireString(body.description, 'the description', { max: 80 }),
    amountCents: requirePositiveCents(body.amountCents, 'the amount'),
    paidBy,
    splitBetween
  })
})
