/**
 * Settld's API client. A single function does the fetch and unwraps the response, so no
 * screen has to remember to check `error`.
 */

import type { Ledger } from '@/lib/store/db'
import type { EncryptedVault, Settld, Settlement, SettlementStatus, User } from '@/lib/split/types'

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

  const payload = await response.json().catch(() => ({ data: null, error: 'Unexpected response from the server' }))

  if (!response.ok || payload.error) {
    throw new ApiError(payload.error ?? 'Something went wrong', response.status)
  }

  return payload.data as T
}

const send = <T> (method: string, path: string, body: unknown) =>
  request<T>(path, { method, body: JSON.stringify(body) })

export const api = {
  listUsers: () => request<User[]>('/api/users'),

  lookupUser: (username: string) =>
    request<User | null>(`/api/users/lookup?username=${encodeURIComponent(username)}`),

  /** For signing back in: the phrase produced an address, here we find out whose it is. */
  lookupUserByAddress: (address: string) =>
    request<User | null>(`/api/users/lookup?address=${encodeURIComponent(address)}`),

  createUser: (input: {
    name: string
    username: string
    walletAddress: string
    vault: EncryptedVault
  }) => send<User>('POST', '/api/users', input),

  /** An account's encrypted bundle, to try opening it with the password. */
  getVault: (username: string) =>
    request<EncryptedVault | null>(`/api/users/vault?username=${encodeURIComponent(username)}`),

  /** Everything one person can see, in one request. Every screen is built from this. */
  getLedger: (userId: string) =>
    request<Ledger>(`/api/ledger?userId=${encodeURIComponent(userId)}`),

  createSettld: (input: {
    description: string
    amountCents: number
    paidBy: string
    splitBetween: string[]
  }) => send<Settld>('POST', '/api/settlds', input),

  updateSettld: (id: string, input: {
    userId: string
    description?: string
    amountCents?: number
    splitBetween?: string[]
  }) => send<Settld>('PATCH', `/api/settlds/${id}`, input),

  deleteSettld: (id: string, userId: string) =>
    request<{ id: string }>(`/api/settlds/${id}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  createSettlement: (input: {
    from: string
    to: string
    amountCents: number
    userOpHash: string
  }) => send<Settlement>('POST', '/api/settlements', input),

  updateSettlement: (id: string, patch: { status: SettlementStatus, txHash?: string }) =>
    send<Settlement>('PATCH', `/api/settlements/${id}`, patch)
}
