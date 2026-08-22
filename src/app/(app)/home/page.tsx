'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CreditCard, Plus, Wallet } from 'lucide-react'
import { AddMoneyDialog } from '@/components/add-money-dialog'
import { AppShell } from '@/components/app-shell'
import { RecentActivity } from '@/components/dashboard/activity-list'
import { FocusCard } from '@/components/dashboard/focus-card'
import { OpenGroups } from '@/components/dashboard/group-list'
import { MonthCard } from '@/components/dashboard/month-card'
import { Panel } from '@/components/dashboard/panel'
import { StatCard } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import { useGroupDetails } from '@/lib/client/use-group-details'
import { useRequireSession } from '@/lib/client/use-session'
import { buildDashboard } from '@/lib/split/dashboard'
import { getBalanceCentsOf } from '@/lib/wdk/wallet'

/**
 * The dashboard.
 *
 * Every other screen in Settld looks at one thing at a time: a group, an expense, a
 * payment. This one is the only place that answers the question you actually open the app
 * with — what is still open, and what do I do about it. So it leads with the three numbers
 * that matter (what you can spend, what you owe, what you're owed) and then puts the group
 * that needs you next to the list of everything else.
 *
 * It's the widest layout in the app: two columns of cards on desktop, a single stack on a
 * phone. Nothing here is decorative — every figure is derived from real groups by
 * `buildDashboard`, which is a pure function and is where the arithmetic is tested.
 */

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return 'Good evening'
  if (hour < 13) return 'Good morning'
  if (hour < 20) return 'Good afternoon'
  return 'Good evening'
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`

export default function HomePage () {
  const session = useRequireSession()
  const details = useGroupDetails(session?.userId)
  const [balanceCents, setBalanceCents] = useState<number | null>(null)

  /** The balance comes from the blockchain, not from our database. */
  const refreshBalance = useCallback(async (address: string) => {
    try {
      setBalanceCents(await getBalanceCentsOf(address))
    } catch {
      setBalanceCents(null)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    void refreshBalance(session.walletAddress)
  }, [session, refreshBalance])

  if (!session) return null

  const board = details ? buildDashboard(details, session.userId) : null

  // "Add expense" needs a group. Whichever one is under the spotlight is the one you were
  // most likely about to touch; with no groups at all, the button creates the first one.
  const addExpenseHref = board?.focus
    ? `/groups/${board.focus.group.id}/expenses/new`
    : '/groups/new'

  return (
    <AppShell width="full" className="gap-4 lg:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4 pt-4 lg:pt-0">
        <div className="min-w-0 flex-1 basis-96">
          <Link
            href="/settings"
            className="-ml-2 flex max-w-full items-center gap-2 rounded-2xl px-2 py-1 text-left transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="truncate font-heading text-2xl font-extrabold tracking-[-0.035em] sm:text-3xl xl:text-4xl">
              {greeting()}, {session.name.split(' ')[0]}
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">Open your settings</span>
          </Link>

          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Here&rsquo;s what&rsquo;s still open.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="pill" asChild>
            <Link href={addExpenseHref}>
              <Plus aria-hidden />
              Add expense
            </Link>
          </Button>

          <AddMoneyDialog
            address={session.walletAddress}
            onFunded={() => refreshBalance(session.walletAddress)}
          >
            <Button size="pill" variant="outline">
              <ArrowDownLeft aria-hidden />
              Add money
            </Button>
          </AddMoneyDialog>
        </div>
      </header>

      <section aria-label="Your money" className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Available balance"
          cents={balanceCents}
          caption="Ready to use"
          icon={CreditCard}
        />

        <StatCard
          label="You owe"
          cents={board?.youOweCents ?? null}
          caption={
            !board || board.pendingPayments === 0
              ? "You're all clear"
              : plural(board.pendingPayments, 'pending payment', 'pending payments')
          }
          icon={ArrowUpRight}
          tone="debit"
        />

        <StatCard
          label="You are owed"
          cents={board?.owedToYouCents ?? null}
          caption={
            !board || board.peopleOwingYou === 0
              ? 'Nobody owes you right now'
              : `${plural(board.peopleOwingYou, 'friend owes', 'friends owe')} you`
          }
          icon={Wallet}
          tone="credit"
        />
      </section>

      {board === null
        ? <Panel><p className="py-8 text-center text-sm text-muted-foreground">Loading…</p></Panel>
        : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:items-start">
              <div id="groups" className="flex min-w-0 scroll-mt-6 flex-col gap-4">
                <section aria-labelledby="groups-label">
                  <OpenGroups groups={board.groups} />
                </section>

                <section id="activity" aria-labelledby="activity-label" className="scroll-mt-6">
                  <RecentActivity items={board.activity} />
                </section>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                {board.focus && (
                  <section aria-labelledby="focus-label">
                    <FocusCard focus={board.focus} userId={session.userId} />
                  </section>
                )}

                <MonthCard month={board.month} />
              </div>
            </div>
          )}
    </AppShell>
  )
}
