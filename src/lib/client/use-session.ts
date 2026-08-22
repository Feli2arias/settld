'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type StoredSession, readSession } from './vault'

type SessionState =
  | { status: 'loading', session: null }
  | { status: 'anonymous', session: null }
  | { status: 'ready', session: StoredSession }

/**
 * Lee la sesión guardada en el dispositivo.
 *
 * Arranca en 'loading' a propósito: la sesión vive en localStorage, así que en el
 * primer render del servidor todavía no existe. Sin ese estado intermedio la app
 * parpadearía mostrando la pantalla de bienvenida a alguien que ya tiene cuenta.
 */
export function useSession (): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading', session: null })

  useEffect(() => {
    const session = readSession()
    setState(session ? { status: 'ready', session } : { status: 'anonymous', session: null })
  }, [])

  return state
}

/** Igual que useSession, pero manda al onboarding a quien no tenga cuenta. */
export function useRequireSession (): StoredSession | null {
  const state = useSession()
  const router = useRouter()

  useEffect(() => {
    if (state.status === 'anonymous') router.replace('/')
  }, [state.status, router])

  return state.status === 'ready' ? state.session : null
}
