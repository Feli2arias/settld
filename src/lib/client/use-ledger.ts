'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { Ledger } from '@/lib/store/db'
import type { User } from '@/lib/split/types'

/**
 * Everything the signed-in person can see: their settlds, their payments and the people
 * in either. Every screen derives what it shows from this with pure functions, so there
 * is one request per screen rather than one per settld.
 *
 * `reload` exists because after paying somebody the numbers have to move.
 */
export function useLedger (userId: string | undefined) {
  const [ledger, setLedger] = useState<Ledger | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) return

    try {
      setLedger(await api.getLedger(userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't load your settlds")
    }
  }, [userId])

  useEffect(() => { void reload() }, [reload])

  return { ledger, error, reload }
}

/** Puts a name to an id. Returns a placeholder rather than throwing if somebody is gone. */
export const personIn = (people: User[], userId: string): User =>
  people.find(person => person.id === userId) ?? {
    id: userId,
    name: 'Someone',
    username: 'unknown',
    walletAddress: ''
  }
