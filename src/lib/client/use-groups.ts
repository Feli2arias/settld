'use client'

import { useEffect, useState } from 'react'
import { api } from './api'
import type { Group } from '@/lib/split/types'

/** Lists a person's groups. Feeds the desktop sidebar navigation. */
export function useGroups (userId: string | undefined) {
  const [groups, setGroups] = useState<Group[] | null>(null)

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    void api.listGroups(userId).then(result => {
      if (!cancelled) setGroups(result)
    })

    return () => { cancelled = true }
  }, [userId])

  return groups
}
