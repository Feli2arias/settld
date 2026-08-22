/**
 * De dónde salen y a dónde van los datos de Split.
 *
 * Hay dos implementaciones y se elige sola según el entorno:
 *
 * - **Archivo** (`.data/split.json`): el default para desarrollo local. Cero setup,
 *   sobrevive reinicios y no depende de ningún servicio externo.
 * - **Redis**: la que se usa en Vercel, donde el filesystem es de sólo lectura.
 *   Habla el API REST de Upstash con `fetch` pelado, así que no suma dependencias.
 *
 * Se descartó Vercel Blob a propósito: su caché de CDN tiene un mínimo de 60 segundos,
 * y una app donde el gasto que acabás de cargar tarda un minuto en aparecerle al otro
 * no sirve.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { Expense, Group, Settlement, StoredUser } from '@/lib/split/types'

export interface Database {
  users: StoredUser[]
  groups: Group[]
  expenses: Expense[]
  settlements: Settlement[]
}

export const EMPTY: Database = { users: [], groups: [], expenses: [], settlements: [] }

const KEY = 'split:db'
const FILE = path.join(process.cwd(), '.data', 'split.json')

/**
 * La integración de Upstash en Vercel inyecta las variables con dos nombres distintos
 * según cuándo se creó el recurso, así que aceptamos los dos.
 */
function redisCredentials (): { url: string, token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

  return url && token ? { url, token } : null
}

export const backendName = () => (redisCredentials() ? 'redis' : 'file')

async function redisCommand (command: unknown[]): Promise<unknown> {
  const credentials = redisCredentials()
  if (!credentials) throw new Error('Redis no está configurado')

  const response = await fetch(credentials.url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${credentials.token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(command),
    cache: 'no-store'
  })

  if (!response.ok) throw new Error(`Redis respondió ${response.status}`)

  const payload = await response.json()
  if (payload.error) throw new Error(payload.error)

  return payload.result
}

export async function loadDatabase (): Promise<Database> {
  if (redisCredentials()) {
    const raw = await redisCommand(['GET', KEY])
    if (typeof raw !== 'string') return { ...EMPTY }
    return { ...EMPTY, ...JSON.parse(raw) }
  }

  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(FILE, 'utf8')) }
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
