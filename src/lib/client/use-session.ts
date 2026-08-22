'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type StoredSession, readSession } from './vault'

type SessionState =
  | { status: 'loading', session: null }
  | { status: 'anonymous', session: null }
  | { status: 'ready', session: StoredSession }

/**
 * Reads the session saved on the device.
 *
 * It starts at 'loading' on purpose: the session lives in localStorage, so on the first
 * server render it doesn't exist yet. Without that in-between state the app would flash
 * the welcome screen at someone who already has an account.
 */
export function useSession (): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading', session: null })

  useEffect(() => {
    const session = readSession()
    setState(session ? { status: 'ready', session } : { status: 'anonymous', session: null })
  }, [])

  return state
}

/** Same as useSession, but sends anyone without an account to onboarding. */
export function useRequireSession (): StoredSession | null {
  const state = useSession()
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'anonymous') router.replace('/')
  }, [state.status, router])

  return state.status === 'ready' ? state.session : null
}
