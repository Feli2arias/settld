import type { NextRequest } from 'next/server'
import { findUserByUsername } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requireUsername } from '@/lib/store/validate'

/** Resuelve @usuario → usuario (con su wallet address). Devuelve null si no existe. */
export const GET = (request: NextRequest) => handle(async () => {
  const username = requireUsername(request.nextUrl.searchParams.get('username'))
  return findUserByUsername(username)
})
