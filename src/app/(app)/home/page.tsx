'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CreditCard, Plus, Wallet } from 'lucide-react'
import { AddMoneyDialog } from '@/components/add-money-dialog'
import { AppShell } from '@/components/app-shell'
import { RecentActivity } from '@/components/dashboard/activity-list'
import { MonthCard } from '@/components/dashboard/month-card'
import { Panel } from '@/components/dashboard/panel'
import { PeopleList } from '@/components/dashboard/people-list'
import { SettldList } from '@/components/dashboard/settld-list'
import { StatCard } from '@/components/dashboard/stat-card'
import { Button } from '@/components/ui/button'
import { useLedger } from '@/lib/client/use-ledger'
import { useRequireSession } from '@/lib/client/use-session'
import { buildDashboard } from '@/lib/split/dashboard'
import { getBalanceCentsOf } from '@/lib/wdk/wallet'

/**
 * The dashboard.
 *
 * Every other screen looks at one thing at a time: a settld, a person, a payment. This one
 * is the only place that answers the question you actually open the app with — what is
 * still open, and what do I do about it. So it leads with the three numbers that matter
 * (what you can spend, what you owe, what you're owed) and then puts the people either
 * side of your balance next to what produced it.
 *
 * Nothing here is decorative: every figure is derived from your ledger by `buildDashboard`,
 * which is a pure function and is where the arithmetic is tested.
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
  const { ledger } = useLedger(session?.userId)
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

  const board = ledger ? buildDashboard(ledger, session.userId) : null

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
            <Link href="/settlds/new">
              <Plus aria-hidden />
              New settld
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
            !board || board.owing.length === 0
              ? "You're all clear"
              : plural(board.owing.length, 'person to pay', 'people to pay')
          }
          icon={ArrowUpRight}
          tone="debit"
        />

        <StatCard
          label="You are owed"
          cents={board?.owedToYouCents ?? null}
          caption={
            !board || board.owed.length === 0
              ? 'Nobody owes you right now'
              : `${plural(board.owed.length, 'friend owes', 'friends owe')} you`
          }
          icon={Wallet}
          tone="credit"
        />
      </section>

      {board === null
        ? <Panel><p className="py-8 text-center text-sm text-muted-foreground">Loading…</p></Panel>
        : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:items-start">
              <div className="flex min-w-0 flex-col gap-4">
                <section aria-labelledby="owing-label">
                  <PeopleList
                    title="You owe"
                    id="owing-label"
                    debts={board.owing}
                    direction="owing"
                    emptyLine="You don't owe anybody."
                  />
                </section>

                <section aria-labelledby="owed-label">
                  <PeopleList
                    title="Owed to you"
                    id="owed-label"
                    debts={board.owed}
                    direction="owed"
                    emptyLine="Nobody owes you."
                  />
                </section>

                <section id="activity" aria-labelledby="activity-label" className="scroll-mt-6">
                  <RecentActivity items={board.activity} />
                </section>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <section aria-labelledby="settlds-label">
                  <SettldList
                    settlds={board.settlds}
                    people={ledger?.people ?? []}
                    userId={session.userId}
                    limit={6}
                  />
                </section>

                <MonthCard month={board.month} />
              </div>
            </div>
          )}
    </AppShell>
  )
}
