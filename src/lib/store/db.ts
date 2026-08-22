/**
 * Almacenamiento de Split.
 *
 * Guarda usuarios, grupos, gastos y settlements en un JSON en disco. Es deliberadamente
 * simple: el estado compartido no es donde está la gracia del proyecto, y así el demo
 * corre sin depender de ningún servicio externo.
 *
 * Acá NO viven seeds ni claves. Lo único que sabemos de una wallet es su address pública.
 *
 * Para deployar a Vercel hay que cambiar este adaptador por Supabase; la interfaz que
 * usa el resto de la app son las funciones exportadas de abajo, así que el cambio queda
 * contenido en este archivo.
 */

import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { Expense, Group, Settlement, SettlementStatus, User } from '@/lib/split/types'

interface Database {
  users: User[]
  groups: Group[]
  expenses: Expense[]
  settlements: Settlement[]
}

const EMPTY: Database = { users: [], groups: [], expenses: [], settlements: [] }
const DB_PATH = path.join(process.cwd(), '.data', 'split.json')

/** Serializa las escrituras para que dos requests simultáneos no se pisen el archivo. */
let queue: Promise<unknown> = Promise.resolve()

async function read (): Promise<Database> {
  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(DB_PATH, 'utf8')) }
  } catch {
    return { ...EMPTY }
  }
}

async function write (db: Database): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2))
}

/** Aplica una mutación sobre el estado y devuelve lo que la mutación produjo. */
function mutate<T> (fn: (db: Database) => T | Promise<T>): Promise<T> {
  const next = queue.then(async () => {
    const db = await read()
    const result = await fn(db)
    await write(db)
    return result
  })

  queue = next.catch(() => {}) // una falla no debe trabar la cola
  return next
}

const now = () => new Date().toISOString()
const normalizeUsername = (username: string) => username.trim().replace(/^@/, '').toLowerCase()

// --- Usuarios ---

export async function listUsers (): Promise<User[]> {
  return (await read()).users
}

export async function findUserByUsername (username: string): Promise<User | null> {
  const target = normalizeUsername(username)
  return (await read()).users.find(u => u.username === target) ?? null
}

export async function findUserById (id: string): Promise<User | null> {
  return (await read()).users.find(u => u.id === id) ?? null
}

export class UsernameTakenError extends Error {
  constructor (username: string) {
    super(`El usuario @${username} ya existe`)
    this.name = 'UsernameTakenError'
  }
}

export function createUser (input: { name: string, username: string, walletAddress: string }): Promise<User> {
  const username = normalizeUsername(input.username)

  return mutate(db => {
    if (db.users.some(u => u.username === username)) throw new UsernameTakenError(username)

    const user: User = {
      id: randomUUID(),
      name: input.name.trim(),
      username,
      walletAddress: input.walletAddress
    }
    db.users.push(user)
    return user
  })
}

// --- Grupos ---

export function createGroup (input: { name: string, memberIds: string[] }): Promise<Group> {
  return mutate(db => {
    const group: Group = {
      id: randomUUID(),
      name: input.name.trim(),
      memberIds: [...new Set(input.memberIds)],
      createdAt: now()
    }
    db.groups.push(group)
    return group
  })
}

export async function listGroupsForUser (userId: string): Promise<Group[]> {
  return (await read()).groups.filter(g => g.memberIds.includes(userId))
}

export async function findGroup (groupId: string): Promise<Group | null> {
  return (await read()).groups.find(g => g.id === groupId) ?? null
}

/** Todo lo que hace falta para pintar la pantalla de un grupo, en una sola lectura. */
export interface GroupDetail {
  group: Group
  members: User[]
  expenses: Expense[]
  settlements: Settlement[]
}

export async function getGroupDetail (groupId: string): Promise<GroupDetail | null> {
  const db = await read()
  const group = db.groups.find(g => g.id === groupId)
  if (!group) return null

  return {
    group,
    members: db.users.filter(u => group.memberIds.includes(u.id)),
    expenses: db.expenses.filter(e => e.groupId === groupId),
    settlements: db.settlements.filter(s => s.groupId === groupId)
  }
}

// --- Gastos ---

export function createExpense (input: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
  return mutate(db => {
    const expense: Expense = { ...input, id: randomUUID(), createdAt: now() }
    db.expenses.push(expense)
    return expense
  })
}

// --- Settlements ---

export function createSettlement (input: Omit<Settlement, 'id' | 'createdAt' | 'status'>): Promise<Settlement> {
  return mutate(db => {
    const settlement: Settlement = { ...input, id: randomUUID(), status: 'pending', createdAt: now() }
    db.settlements.push(settlement)
    return settlement
  })
}

export function updateSettlement (
  id: string,
  patch: { status: SettlementStatus, txHash?: string }
): Promise<Settlement | null> {
  return mutate(db => {
    const index = db.settlements.findIndex(s => s.id === id)
    if (index === -1) return null

    const updated: Settlement = { ...db.settlements[index], ...patch }
    db.settlements[index] = updated
    return updated
  })
}
