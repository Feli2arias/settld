/**
 * Cliente de la API de Split. Una sola función hace el fetch y desenvuelve la
 * respuesta, así ninguna pantalla tiene que acordarse de mirar `error`.
 */

import type { GroupDetail } from '@/lib/store/db'
import type { Expense, Group, Settlement, SettlementStatus, User } from '@/lib/split/types'

export class ApiError extends Error {
  constructor (message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T> (path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined
  })

  const payload = await response.json().catch(() => ({ data: null, error: 'Respuesta inesperada del servidor' }))

  if (!response.ok || payload.error) {
    throw new ApiError(payload.error ?? 'Algo salió mal', response.status)
  }

  return payload.data as T
}

const post = <T> (path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  listUsers: () => request<User[]>('/api/users'),

  lookupUser: (username: string) =>
    request<User | null>(`/api/users/lookup?username=${encodeURIComponent(username)}`),

  createUser: (input: { name: string, username: string, walletAddress: string }) =>
    post<User>('/api/users', input),

  listGroups: (userId: string) =>
    request<Group[]>(`/api/groups?userId=${encodeURIComponent(userId)}`),

  getGroup: (groupId: string) => request<GroupDetail>(`/api/groups/${groupId}`),

  createGroup: (input: { name: string, memberIds: string[] }) =>
    post<Group>('/api/groups', input),

  createExpense: (input: {
    groupId: string
    description: string
    amountCents: number
    paidBy: string
    splitBetween: string[]
  }) => post<Expense>('/api/expenses', input),

  createSettlement: (input: {
    groupId: string
    from: string
    to: string
    amountCents: number
    userOpHash: string
  }) => post<Settlement>('/api/settlements', input),

  updateSettlement: (id: string, patch: { status: SettlementStatus, txHash?: string }) =>
    request<Settlement>(`/api/settlements/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}
