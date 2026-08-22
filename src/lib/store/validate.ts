/**
 * Validación de lo que entra por la API. Nada que venga del cliente se toca sin pasar
 * por acá: un monto negativo o una address mal formada tienen que morir en el borde,
 * no tres capas más adentro.
 */

export class ValidationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function requireString (value: unknown, field: string, { max = 120 } = {}): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`Falta ${field}`)
  }
  if (value.length > max) {
    throw new ValidationError(`${field} es demasiado largo`)
  }
  return value.trim()
}

export function requirePositiveCents (value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} tiene que ser un monto válido mayor a cero`)
  }
  return value
}

export function requireStringArray (value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.some(v => typeof v !== 'string')) {
    throw new ValidationError(`${field} tiene que tener al menos un elemento`)
  }
  return value as string[]
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function requireWalletAddress (value: unknown, field = 'la address'): string {
  const address = requireString(value, field, { max: 42 })

  if (!EVM_ADDRESS.test(address)) throw new ValidationError(`${field} no tiene un formato válido`)
  if (address.toLowerCase() === ZERO_ADDRESS) throw new ValidationError(`${field} no puede ser la dirección cero`)

  return address
}

const USERNAME = /^[a-z0-9_]{3,20}$/

export function requireUsername (value: unknown): string {
  const username = requireString(value, 'el usuario', { max: 21 }).replace(/^@/, '').toLowerCase()

  if (!USERNAME.test(username)) {
    throw new ValidationError('El usuario tiene que tener entre 3 y 20 caracteres: letras, números o guión bajo')
  }
  return username
}
