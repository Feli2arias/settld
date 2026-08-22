/**
 * Modelo de datos de Split.
 *
 * Todos los montos viven en "centavos" (enteros) para no arrastrar errores de punto
 * flotante al repartir un gasto. USD₮ tiene 6 decimales on-chain, así que la conversión
 * a unidades de token es `cents * 10_000`.
 */

export const CENTS_PER_UNIT = 100
export const TOKEN_UNITS_PER_CENT = 10_000

/**
 * La wallet cifrada con la contraseña del usuario.
 *
 * Es lo único que Split guarda de las claves, y sin la contraseña —que nunca llega
 * al servidor— no se puede abrir. Por eso nunca viaja junto al resto del usuario:
 * se pide aparte, sólo al iniciar sesión.
 */
export interface EncryptedVault {
  cipher: string
  salt: string
  iv: string
  iterations: number
}

export interface User {
  id: string
  name: string
  username: string
  /** Address de la smart account de WDK. La derivamos en el browser al crear la cuenta. */
  walletAddress: string
}

/** El usuario tal como se guarda. El vault no sale de acá salvo al iniciar sesión. */
export interface StoredUser extends User {
  vault?: EncryptedVault
}

export interface Group {
  id: string
  name: string
  memberIds: string[]
  createdAt: string
}

export interface Expense {
  id: string
  groupId: string
  description: string
  /** Monto total en centavos. */
  amountCents: number
  paidBy: string
  splitBetween: string[]
  createdAt: string
}

export type SettlementStatus = 'pending' | 'confirmed' | 'failed'

export interface Settlement {
  id: string
  groupId: string
  from: string
  to: string
  amountCents: number
  status: SettlementStatus
  /** Hash de la UserOperation que devuelve WDK. */
  userOpHash?: string
  /** Hash de la transacción real en la blockchain, resuelto contra el bundler. */
  txHash?: string
  createdAt: string
}

/** Una transferencia que alguien tiene que hacer para saldar sus cuentas. */
export interface Payment {
  from: string
  to: string
  amountCents: number
}
