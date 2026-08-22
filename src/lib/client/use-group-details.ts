'use client'

import { useEffect, useState } from 'react'
import { api } from './api'
import type { GroupDetail } from '@/lib/store/db'

/**
 * Loads every group the person belongs to, with its expenses, members and settlements.
 *
 * The dashboard, the groups screen and the activity screen all need the same thing: the
 * whole picture, not one group. They each derive what they show from this with pure
 * functions, so the fetching lives in one place.
 */
export function useGroupDetails (userId: string | undefined) {
  const [details, setDetails] = useState<GroupDetail[] | null>(null)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    void (async () => {
      const groups = await api.listGroups(userId)
      const loaded = await Promise.all(groups.map(group => api.getGroup(group.id)))
      if (!cancelled) setDetails(loaded)
    })()

    return () => { cancelled = true }
  }, [userId])

  return details
}
