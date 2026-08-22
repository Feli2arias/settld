'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ExternalLink, Plus } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Panel } from '@/components/dashboard/panel'
import { useRequireSession } from '@/lib/client/use-session'
import { useGroupDetails } from '@/lib/client/use-group-details'
import { type ActivityKind, allActivity, groupByDay, timeLabel } from '@/lib/split/dashboard'
import { explorerTxUrl } from '@/lib/wdk/config'
import { cn } from '@/lib/utils'

/**
 * Everything that has ever happened, across every group.
 *
 * The dashboard shows the last five, which answers "what did I miss". This screen answers
 * the other question: "did that payment actually go through, and when". So it is the only
 * place that links out to the receipt on the public explorer — the proof that the money
 * really moved, for whoever wants to check.
 *
 * Split by day, because a flat list of forty rows is a wall.
 */

const KINDS: Record<ActivityKind, { icon: typeof Plus, disc: string }> = {
  expense: { icon: Plus, disc: 'bg-secondary text-muted-foreground' },
  received: { icon: ArrowDownLeft, disc: 'bg-credit-surface text-credit' },
  sent: { icon: ArrowUpRight, disc: 'bg-debit-surface text-debit' },
  other: { icon: ArrowLeftRight, disc: 'bg-secondary text-muted-foreground' }
}

const STATUS = {
  confirmed: 'text-credit',
  pending: 'text-muted-foreground',
  failed: 'text-debit'
} as const

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'payments', label: 'Payments' },
  { id: 'expenses', label: 'Expenses' }
] as const

type Filter = (typeof FILTERS)[number]['id']

export default function ActivityPage () {
  const session = useRequireSession()
  const details = useGroupDetails(session?.userId)
  const [filter, setFilter] = useState<Filter>('all')

  if (!session) return null

  const history = details ? allActivity(details, session.userId) : null

  const shown = history?.filter(item =>
    filter === 'all' ||
    (filter === 'expenses' ? item.kind === 'expense' : item.kind !== 'expense')
  )

  return (
    <AppShell title="Activity" width="wide" className="gap-5">
      <div role="tablist" aria-label="Filter activity" className="flex gap-1.5">
        {FILTERS.map(option => {
          const active = filter === option.id

          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(option.id)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-bold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {shown === undefined && (
        <Panel><p className="py-8 text-center text-sm text-muted-foreground">Loading…</p></Panel>
      )}

      {shown?.length === 0 && (
        <Panel>
          <div className="py-10 text-center">
            <p className="font-heading text-lg font-bold">Nothing here yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {filter === 'all'
                ? 'Add an expense and it shows up here.'
                : 'Nothing of this kind has happened yet.'}
            </p>
          </div>
        </Panel>
      )}

      {shown && shown.length > 0 && groupByDay(shown).map(day => (
        <section key={day.label} aria-label={day.label}>
          <p className="eyebrow mb-2.5 px-1">{day.label}</p>

          <Panel className="p-2 lg:p-2">
            <ul className="divide-y divide-border">
              {day.items.map(item => {
                const { icon: Icon, disc } = KINDS[item.kind]

                return (
                  <li key={item.id} className="flex items-center gap-3 px-3 py-3">
                    <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', disc)}>
                      <Icon className="size-4" strokeWidth={2.5} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                        <Link
                          href={`/groups/${item.groupId}`}
                          className="transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {item.groupName}
                        </Link>
                        {' · '}{timeLabel(item.at)}
                        {/* On a phone the row is too narrow for a column of its own, so the
                            status rides along here instead of squeezing the sentence. */}
                        {item.status && (
                          <span className={cn('sm:hidden', STATUS[item.status])}>
                            {' · '}{item.status}
                          </span>
                        )}
                      </span>
                    </span>

                    {item.status && (
                      <span className={cn('hidden shrink-0 text-xs font-bold sm:block', STATUS[item.status])}>
                        {item.status}
                      </span>
                    )}

                    {item.txHash
                      ? (
                          <a
                            href={explorerTxUrl(item.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          >
                            <ExternalLink className="size-3.5" aria-hidden />
                            <span className="hidden sm:inline">Receipt</span>
                            <span className="sr-only">Open the receipt for {item.title}</span>
                          </a>
                        )
                      : <span className="w-2 shrink-0" aria-hidden />}
                  </li>
                )
              })}
            </ul>
          </Panel>
        </section>
      ))}
    </AppShell>
  )
}
