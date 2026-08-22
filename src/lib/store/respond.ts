/**
 * A single wrapper for API responses, so the client always receives the same shape
 * and errors never escape as stack traces.
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

/** Runs a handler and translates any exception into a response the user can understand. */
export async function handle<T> (fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return ok(await fn())
  } catch (error) {
    if (error instanceof ValidationError) return fail(error.message, 400)
    if (error instanceof UsernameTakenError) return fail(error.message, 409)

    console.error('[api]', error)
    return fail('Something went wrong. Try again.', 500)
  }
}
