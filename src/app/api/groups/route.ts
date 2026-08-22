import type { NextRequest } from 'next/server'
import { createGroup, listGroupsForUser } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requireString, requireStringArray } from '@/lib/store/validate'

export const GET = (request: NextRequest) => handle(() => {
  const userId = requireString(request.nextUrl.searchParams.get('userId'), 'el usuario')
  return listGroupsForUser(userId)
})

export const POST = (request: NextRequest) => handle(async () => {
  const body = await request.json()

  return createGroup({
    name: requireString(body.name, 'el nombre del grupo', { max: 60 }),
    memberIds: requireStringArray(body.memberIds, 'los miembros')
  })
})
