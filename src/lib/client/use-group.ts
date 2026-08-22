'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { GroupDetail } from '@/lib/store/db'

/** Loads a group and exposes a `reload` to refresh it after a change. */
export function useGroup (groupId: string) {
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setDetail(await api.getGroup(groupId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't load the group")
    }
  }, [groupId])

  useEffect(() => { void reload() }, [reload])

  return { detail, error, reload }
}

/** Finds someone in the group by id. Returns a placeholder if they are gone. */
export const memberOf = (detail: GroupDetail, userId: string) =>
  detail.members.find(m => m.id === userId) ?? {
    id: userId,
    name: 'Someone',
    username: 'unknown',
    walletAddress: ''
  }
