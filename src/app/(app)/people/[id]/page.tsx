'use client'

import { use } from 'react'
import Link from 'next/link'
import { Amount } from '@/components/amount'
import { AppShell } from '@/components/app-shell'
import { Panel } from '@/components/dashboard/panel'
import { PersonAvatar } from '@/components/person'
import { SettldList } from '@/components/dashboard/settld-list'
import { Button } from '@/components/ui/button'
import { personIn, useLedger } from '@/lib/client/use-ledger'
import { useRequireSession } from '@/lib/client/use-session'
import { debtWith } from '@/lib/split/dashboard'
import { formatMoney } from '@/lib/wdk/money'

/**
 * Where you stand with one person.
 *
 * This is what a group screen used to be, except the thing it is about is a person rather
 * than a folder. One number, then everything that produced it, so the number is never a
 * claim you have to take on faith.
 */
export default function PersonPage ({ params }: PageProps<'/people/[id]'>) {
  const { id } = use(params)
  const session = useRequireSession()
  const { ledger } = useLedger(session?.userId)

  if (!session) return null

  if (!ledger) {
    return (
      <AppShell title="Person" backHref="/home" width="wide" className="max-w-2xl">
        <p className="pt-8 text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    )
  }

  const person = personIn(ledger.people, id)
  const debt = debtWith(ledger, session.userId, id)

  /** Only what the two of you are both in. The rest is none of their business, or yours. */
  const shared = ledger.settlds
    .filter(settld => settld.splitBetween.includes(id) || settld.paidBy === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <AppShell title={person.name} backHref="/home" width="wide" className="max-w-2xl gap-4">
      <Panel>
        <div className="flex items-center gap-4">
          <PersonAvatar user={person} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-heading text-xl font-extrabold">{person.name}</p>
            <p className="truncate text-sm font-semibold text-muted-foreground">@{person.username}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <p className="eyebrow mb-1.5">
            {debt.netCents === 0 ? 'You are square' : debt.netCents > 0 ? 'They owe you' : 'You owe them'}
          </p>

          {debt.netCents === 0
            ? (
                <p className="font-heading text-2xl font-extrabold text-credit">
                  Nothing open ✓
                </p>
              )
            : (
                <Amount
                  cents={Math.abs(debt.netCents)}
                  size="lg"
                  tone={debt.netCents > 0 ? 'credit' : 'debit'}
                  className="block"
                />
              )}

          {debt.netCents < 0 && (
            <Button size="pill-lg" className="mt-5" asChild>
              <Link href={`/settle/${id}`}>
                Settle up {formatMoney(-debt.netCents)}
              </Link>
            </Button>
          )}

          {debt.netCents > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              They settle from their own device. Settld can&rsquo;t move money out of
              somebody else&rsquo;s account, and wouldn&rsquo;t want to be able to.
            </p>
          )}
        </div>
      </Panel>

      <SettldList
        settlds={shared}
        people={ledger.people}
        userId={session.userId}
        title="What you share"
        emptyTitle="Nothing shared yet"
        emptyLine={`You and ${person.name.split(' ')[0]} haven't split anything.`}
      />
    </AppShell>
  )
}
