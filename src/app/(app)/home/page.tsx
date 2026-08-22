'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowDownLeft, ChevronDown, Plus } from 'lucide-react'
import { AccountDialog } from '@/components/account-dialog'
import { AddMoneyDialog } from '@/components/add-money-dialog'
import { Amount } from '@/components/amount'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/client/api'
import { useRequireSession } from '@/lib/client/use-session'
import { settlementPlan } from '@/lib/split/balances'
import type { Group } from '@/lib/split/types'
import { getBalanceCentsOf } from '@/lib/wdk/wallet'

interface GroupSummary {
  group: Group
  netCents: number
}

const greeting = () => {
  const hour = new Date().getHours()
  if (hour < 6) return 'Buenas noches'
  if (hour < 13) return 'Buen día'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function HomePage () {
  const session = useRequireSession()
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [summaries, setSummaries] = useState<GroupSummary[] | null>(null)

  /** El saldo sale de la blockchain, no de nuestra base de datos. */
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

  useEffect(() => {
    if (!session) return

    let cancelled = false

    void (async () => {
      const groups = await api.listGroups(session.userId)
      const details = await Promise.all(groups.map(group => api.getGroup(group.id)))
      if (cancelled) return

      setSummaries(
        details.map(detail => ({
          group: detail.group,
          netCents: settlementPlan(detail.expenses, detail.settlements, session.userId).netCents
        }))
      )
    })()

    return () => { cancelled = true }
  }, [session])

  if (!session) return null

  return (
    <AppShell width="wide" className="gap-8 lg:gap-10">
      <header className="pt-4 lg:pt-0">
        <AccountDialog session={session}>
          <button
            type="button"
            className="-ml-2 flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:text-base"
          >
            {greeting()}, {session.name.split(' ')[0]}
            <ChevronDown className="size-4" aria-hidden />
            <span className="sr-only">Abrir tu cuenta</span>
          </button>
        </AccountDialog>
      </header>

      <section aria-labelledby="balance-label">
        <p id="balance-label" className="eyebrow mb-3">Tu saldo</p>
        {balanceCents === null
          ? <span className="amount block text-[3.75rem] text-muted-foreground sm:text-[4.5rem]">···</span>
          : <Amount cents={balanceCents} size="hero" />}

        <div className="mt-6 flex gap-3">
          <AddMoneyDialog
            address={session.walletAddress}
            onFunded={() => refreshBalance(session.walletAddress)}
          >
            <Button size="pill">
              <ArrowDownLeft aria-hidden />
              Cargar saldo
            </Button>
          </AddMoneyDialog>
        </div>
      </section>

      <section aria-labelledby="groups-label" className="flex-1">
        <p id="groups-label" className="eyebrow mb-3">Tus grupos</p>

        {summaries === null && (
          <p className="py-6 text-sm text-muted-foreground">Cargando…</p>
        )}

        {summaries?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
            <p className="font-heading text-lg font-bold">Todavía no tenés grupos</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Creá uno para empezar a dividir gastos.
            </p>
          </div>
        )}

        <ul className="grid gap-3 md:grid-cols-2">
          {summaries?.map(({ group, netCents }) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex h-full items-center justify-between gap-4 rounded-3xl bg-card px-5 py-4 ring-1 ring-border transition-all motion-safe:hover:scale-[1.01] hover:ring-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-heading text-lg font-bold">{group.name}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
                    {netCents === 0
                      ? 'Estás al día'
                      : netCents > 0 ? 'Te deben' : 'Debés'}
                  </span>
                </span>

                {netCents === 0
                  ? <span aria-hidden className="text-xl text-credit">✓</span>
                  : <Amount cents={Math.abs(netCents)} size="md" tone={netCents > 0 ? 'credit' : 'debit'} />}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* En desktop este botón ya vive en la barra lateral. */}
      <Button size="pill-lg" variant="secondary" className="lg:hidden" asChild>
        <Link href="/groups/new">
          <Plus aria-hidden />
          Nuevo grupo
        </Link>
      </Button>
    </AppShell>
  )
}
