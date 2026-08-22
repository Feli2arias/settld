/**
 * Where Settld's data comes from and goes to.
 *
 * There are two implementations and the environment picks one on its own:
 *
 * - **File** (`.data/split.json`): the default for local development. Zero setup,
 *   survives restarts and depends on no external service.
 * - **Redis**: what runs on Vercel, where the filesystem is read-only. Speaks Upstash's
 *   REST API with bare `fetch`, so it adds no dependencies.
 *
 * Vercel Blob was ruled out deliberately: its CDN cache has a 60-second minimum, and an
 * app where the expense you just added takes a minute to reach the other person is useless.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { Settld, Settlement, StoredUser } from '@/lib/split/types'
import { migrateSettlds, migrateSettlements } from './migrate'

export interface Database {
  users: StoredUser[]
  settlds: Settld[]
  settlements: Settlement[]
}

export const EMPTY: Database = { users: [], settlds: [], settlements: [] }

/**
 * Reads a stored database of any shape we have ever written.
 *
 * Data from the version with groups comes through here on every read, so nobody has to
 * remember to run a migration. The first write after that stores the new shape and the
 * old fields are gone for good.
 */
function adopt (raw: unknown): Database {
  const stored = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>

  return {
    users: Array.isArray(stored.users) ? (stored.users as StoredUser[]) : [],
    settlds: migrateSettlds(stored),
    settlements: migrateSettlements(stored)
  }
}

const KEY = 'split:db'
const FILE = path.join(process.cwd(), '.data', 'split.json')

/**
 * Vercel's Upstash integration injects the variables under two different names depending
 * on when the resource was created, so we accept both.
 */
function redisCredentials (): { url: string, token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

  return url && token ? { url, token } : null
}

export const backendName = () => (redisCredentials() ? 'redis' : 'file')

async function redisCommand (command: unknown[]): Promise<unknown> {
  const credentials = redisCredentials()
  if (!credentials) throw new Error('Redis is not configured')

  const response = await fetch(credentials.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${credentials.token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(command),
    cache: 'no-store'
  })

  if (!response.ok) throw new Error(`Redis answered ${response.status}`)

  const payload = await response.json()
  if (payload.error) throw new Error(payload.error)

  return payload.result
}

export async function loadDatabase (): Promise<Database> {
  if (redisCredentials()) {
    const raw = await redisCommand(['GET', KEY])
    return typeof raw === 'string' ? adopt(JSON.parse(raw)) : { ...EMPTY }
  }

  try {
    return adopt(JSON.parse(await fs.readFile(FILE, 'utf8')))
  } catch {
    return { ...EMPTY }
  }
}

export async function saveDatabase (db: Database): Promise<void> {
  const serialized = JSON.stringify(db, null, 2)

  if (redisCredentials()) {
    await redisCommand(['SET', KEY, serialized])
    return
  }

  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, serialized)
}
