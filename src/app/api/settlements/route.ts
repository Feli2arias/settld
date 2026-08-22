import type { NextRequest } from 'next/server'
import { createSettlement } from '@/lib/store/db'
import { handle } from '@/lib/store/respond'
import { requirePositiveCents, requireString } from '@/lib/store/validate'

/**
 * Records a payment just sent to the network, in `pending` state.
 *
 * The payment executes from the user's wallet in the browser; the server only notes that
 * it happened. Until it confirms on-chain, the debt still counts as unpaid.
 */
export const POST = (request: NextRequest) => handle(async () => {
  const body = await request.json()

  return createSettlement({
    groupId: requireString(body.groupId, 'the group'),
    from: requireString(body.from, 'who is paying'),
    to: requireString(body.to, 'who they are paying'),
    amountCents: requirePositiveCents(body.amountCents, 'the amount'),
    userOpHash: requireString(body.userOpHash, 'the operation hash', { max: 80 })
  })
})
