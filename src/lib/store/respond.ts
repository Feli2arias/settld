/**
 * Envoltorio único para las respuestas de la API, así el cliente siempre recibe
 * la misma forma y los errores nunca se escapan como stack traces.
 */

import { NextResponse } from 'next/server'
import { UsernameTakenError } from './db'
import { ValidationError } from './validate'

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export const ok = <T> (data: T, status = 200) =>
  NextResponse.json<ApiResponse<T>>({ data, error: null }, { status })

export const fail = (error: string, status: number) =>
  NextResponse.json<ApiResponse<never>>({ data: null, error }, { status })

/** Corre un handler y traduce cualquier excepción a una respuesta que el usuario entienda. */
export async function handle<T> (fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return ok(await fn())
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 400)
    if (error instanceof UsernameTakenError) return fail(error.message, 409)

    console.error('[api]', error)
    return fail('Algo salió mal. Probá de nuevo.', 500)
  }
}
