'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { Amount } from '@/components/amount'
import { AppShell } from '@/components/app-shell'
import { Panel } from '@/components/dashboard/panel'
import { PersonAvatar } from '@/components/person'
import { SettldForm } from '@/components/settld-form'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/client/api'
import { personIn, useLedger } from '@/lib/client/use-ledger'
import { useRequireSession } from '@/lib/client/use-session'
import { sessionUser } from '@/lib/client/vault'
import { participantsOf } from '@/lib/split/balances'
import { formatWhen } from '@/lib/split/dashboard'
import { formatMoney } from '@/lib/wdk/money'
import { cn } from '@/lib/utils'

/**
 * One settld: what it was, and where everybody stands on it.
 *
 * Only whoever paid can edit or delete it, and the button simply isn't there for anybody
 * else — the server enforces the same rule, so the button is a courtesy, not the lock.
 *
 * "Settled" on a row means settled **with the payer**, across everything between them.
 * Payments are not filed against an invoice: you pay a person, not a line item.
 */

const STATUS = {
  paid: { label: 'Paid', className: 'text-credit' },
  settled: { label: 'Settled', className: 'text-credit' },
  owes: { label: 'Owes', className: 'text-debit' }
} as const

export default function SettldPage ({ params }: PageProps<'/settlds/[id]'>) {
  const { id } = use(params)
  const session = useRequireSession()
  const { ledger, reload } = useLedger(session?.userId)
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  if (!session) return null

  if (!ledger) {
    return (
      <AppShell title="Settld" backHref="/settlds" width="wide" className="max-w-2xl">
        <p className="pt-8 text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    )
  }

  const settld = ledger.settlds.find(entry => entry.id === id)

  if (!settld) {
    return (
      <AppShell title="Settld" backHref="/settlds" width="wide" className="max-w-2xl">
        <p role="alert" className="mt-8 rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
          We couldn&rsquo;t find that settld.
        </p>
      </AppShell>
    )
  }

  const yours = settld.paidBy === session.userId
  const payer = personIn(ledger.people, settld.paidBy)
  const participants = participantsOf(settld, ledger.settlements, ledger.settlds)

  if (editing) {
    return (
      <AppShell title="Edit settld" backHref={`/settlds/${id}`} className="gap-7">
        <SettldForm
          session={sessionUser(session)}
          people={ledger.people}
          initial={{
            description: settld.description,
            amountCents: settld.amountCents,
            splitBetween: settld.splitBetween
          }}
          submitLabel="Save changes"
          onSubmit={async draft => {
            await api.updateSettld(id, { userId: session.userId, ...draft })
            await reload()
            setEditing(false)
          }}
          onDelete={async () => {
            await api.deleteSettld(id, session.userId)
            router.replace('/settlds')
          }}
        />
      </AppShell>
    )
  }

  return (
    <AppShell
      title={settld.description}
      backHref="/settlds"
      width="wide"
      className="max-w-2xl gap-4"
      action={yours
        ? (
            <Button size="pill" variant="secondary" className="ml-auto" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              <span className="hidden sm:inline">Edit</span>
              <span className="sr-only sm:hidden">Edit</span>
            </Button>
          )
        : undefined}
    >
      <Panel>
        <p className="eyebrow mb-1.5">Total</p>
        <Amount cents={settld.amountCents} size="lg" className="block" />
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          {yours ? 'Paid by you' : `Paid by ${payer.name}`} · {formatWhen(settld.createdAt)}
        </p>
      </Panel>

      <Panel>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="eyebrow pb-2 text-left">People</th>
              <th scope="col" className="eyebrow hidden pb-2 text-right sm:table-cell">Share</th>
              <th scope="col" className="eyebrow pb-2 text-right">Status</th>
            </tr>
          </thead>

          <tbody>
            {participants.map(({ userId, shareCents, status }) => {
              const person = personIn(ledger.people, userId)

              return (
                <tr key={userId} className="border-b border-border last:border-0">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2.5">
                      <PersonAvatar user={person} size="sm" />
                      <span className="min-w-0 truncate font-semibold">
                        {person.name}
                        {userId === session.userId && (
                          <span className="font-normal text-muted-foreground"> (you)</span>
                        )}
                      </span>
                    </span>
                  </td>

                  <td className="hidden py-2.5 text-right font-semibold tabular-nums text-muted-foreground sm:table-cell">
                    {formatMoney(shareCents)}
                  </td>

                  <td className={cn('py-2.5 text-right text-sm font-bold', STATUS[status].className)}>
                    {STATUS[status].label}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>
    </AppShell>
  )
}
