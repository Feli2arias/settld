import type { NextRequest } from 'next/server'
import { createSettld } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { ValidationError, requirePositiveCents, requireString, requireStringArray } from '@/lib/store/validate'

export async function POST (request: NextRequest) {
  return handle(async () => {
    const body = await request.json()

    const paidBy = requireString(body.paidBy, 'whoever paid')
    const splitBetween = requireStringArray(body.splitBetween, 'the people')

    // Splitting something between one person is not a settld, it is a purchase.
    if (splitBetween.length < 2) {
      throw new ValidationError('A settld needs at least two people')
    }

    if (!splitBetween.includes(paidBy)) {
      throw new ValidationError('Whoever paid has to be one of the people')
    }

    return createSettld({
      description: requireString(body.description, 'the description'),
      amountCents: requirePositiveCents(body.amountCents, 'the amount'),
      paidBy,
      splitBetween: [...new Set(splitBetween)]
    })
  })
}
