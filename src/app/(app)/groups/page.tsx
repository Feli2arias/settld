'use client'

import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { Amount } from '@/components/amount'
import { AppShell } from '@/components/app-shell'
import { Chip, Panel } from '@/components/dashboard/panel'
import { PersonAvatar, initials, tintFor } from '@/components/person'
import { Button } from '@/components/ui/button'
import { useRequireSession } from '@/lib/client/use-session'
import { useGroupDetails } from '@/lib/client/use-group-details'
import { buildDashboard, memberShares } from '@/lib/split/dashboard'
import { formatMoney } from '@/lib/wdk/money'
import { cn } from '@/lib/utils'

/**
 * Every group, with enough of each one that you rarely need to open it.
 *
 * The dashboard lists the groups in a single line each, which is right for a summary. Here
 * there is room to say who is in it, how much has gone through it and who is still short —
 * so this screen answers "which one do I have to chase" without four round trips.
 */
export default function GroupsPage () {
  const session = useRequireSession()
  const details = useGroupDetails(session?.userId)

  if (!session) return null

  const board = details ? buildDashboard(details, session.userId) : null

  return (
    <AppShell
      title="Groups"
      width="wide"
      className="gap-4"
      action={
        <Button size="pill" asChild className="ml-auto">
          <Link href="/groups/new">
            <Plus aria-hidden />
            <span className="hidden sm:inline">New group</span>
            <span className="sr-only sm:hidden">New group</span>
          </Link>
        </Button>
      }
    >
      {board === null && (
        <Panel><p className="py-8 text-center text-sm text-muted-foreground">Loading…</p></Panel>
      )}

      {board?.groups.length === 0 && (
        <Panel>
          <div className="py-10 text-center">
            <p className="font-heading text-lg font-bold">No groups yet</p>
            <p className="mt-1.5 mb-5 text-sm text-muted-foreground">
              A group is a trip, a flat, a dinner — anything you split more than once.
            </p>
            <Button size="pill" asChild>
              <Link href="/groups/new">
                <Plus aria-hidden />
                New group
              </Link>
            </Button>
          </div>
        </Panel>
      )}

      <ul className="grid gap-4 xl:grid-cols-2">
        {board?.groups.map(card => {
          const detail = details?.find(d => d.group.id === card.group.id)
          const shares = detail ? memberShares(detail) : []
          const owing = shares.filter(share => share.status === 'owes')
          // The chip is about the other people. Your own debt is already the big figure
          // above it, and naming yourself there reads like a scolding.
          const others = owing.filter(share => share.user.id !== session.userId)

          return (
            <li key={card.group.id}>
              <Panel className="h-full transition-colors hover:bg-secondary/40">
                <Link
                  href={`/groups/${card.group.id}`}
                  className="flex items-center gap-3 rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold',
                      tintFor(card.group.name)
                    )}
                  >
                    {initials(card.group.name)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-lg font-extrabold">
                      {card.group.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                      {formatMoney(card.totalCents)} across {card.expenseCount}{' '}
                      {card.expenseCount === 1 ? 'expense' : 'expenses'}
                    </span>
                  </span>

                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>

                <div className="mt-4 flex items-end justify-between gap-4 border-t border-border pt-4">
                  <div className="min-w-0">
                    <p className="eyebrow mb-1.5">
                      {card.netCents === 0 ? 'Your balance' : card.netCents > 0 ? 'You are owed' : 'You owe'}
                    </p>
                    <Amount
                      cents={Math.abs(card.netCents)}
                      size="md"
                      tone={card.netCents === 0 ? 'neutral' : card.netCents > 0 ? 'credit' : 'debit'}
                    />
                  </div>

                  {card.netCents < 0
                    ? (
                        <Button size="pill" asChild>
                          <Link href={`/groups/${card.group.id}/settle`}>
                            Settle up
                          </Link>
                        </Button>
                      )
                    : (
                        <Button size="pill" variant="secondary" asChild>
                          <Link href={`/groups/${card.group.id}/expenses/new`}>
                            <Plus aria-hidden />
                            Expense
                          </Link>
                        </Button>
                      )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <span className="flex -space-x-2">
                    {shares.map(({ user }) => (
                      <PersonAvatar
                        key={user.id}
                        user={user}
                        size="sm"
                        className="ring-2 ring-card"
                      />
                    ))}
                  </span>

                  <span className="text-xs font-semibold text-muted-foreground">
                    {card.memberCount} people
                  </span>

                  {others.length > 0 && (
                    <Chip tone="debit" className="ml-auto">
                      {others.length === 1
                        ? `${others[0].user.name.split(' ')[0]} still owes`
                        : `${others.length} still owe`}
                    </Chip>
                  )}

                  {owing.length === 0 && card.expenseCount > 0 && (
                    <Chip tone="credit" className="ml-auto">All settled</Chip>
                  )}
                </div>
              </Panel>
            </li>
          )
        })}
      </ul>
    </AppShell>
  )
}
