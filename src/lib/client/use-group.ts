'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import type { GroupDetail } from '@/lib/store/db'

/** Carga un grupo y expone un `reload` para refrescarlo después de un cambio. */
export function useGroup (groupId: string) {
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setDetail(await api.getGroup(groupId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos cargar el grupo')
    }
  }, [groupId])

  useEffect(() => { void reload() }, [reload])

  return { detail, error, reload }
}

/** Busca a una persona del grupo por id. Devuelve un placeholder si ya no está. */
export const memberOf = (detail: GroupDetail, userId: string) =>
  detail.members.find(m => m.id === userId) ?? {
    id: userId,
    name: 'Alguien',
    username: 'desconocido',
    walletAddress: ''
  }
