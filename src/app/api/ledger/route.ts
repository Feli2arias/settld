import type { NextRequest } from 'next/server'
import { getLedger } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requireString } from '@/lib/store/validate'

/**
 * Everything one person can see, in a single request: their settlds, their payments and
 * the people involved in either.
 *
 * The screens all derive what they show from this with pure functions, so there is one
 * round trip per screen instead of one per settld.
 */
export async function GET (request: NextRequest) {
  return handle(async () => {
    const userId = requireString(request.nextUrl.searchParams.get('userId'), 'the user')
    return getLedger(userId)
  })
}
