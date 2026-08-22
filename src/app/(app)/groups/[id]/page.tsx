'use client'

import { use } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Amount } from '@/components/amount'
import { AppShell } from '@/components/app-shell'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { memberOf, useGroup } from '@/lib/client/use-group'
import { useRequireSession } from '@/lib/client/use-session'
import { computeNetBalances, settlementPlan, splitEqually } from '@/lib/split/balances'
import { formatMoney } from '@/lib/wdk/money'

export default function GroupPage ({ params }: PageProps<'/groups/[id]'>) {
  const { id } = use(params)
  const session = useRequireSession()
  const { detail, error } = useGroup(id)

  if (!session) return null

  if (error) {
    return (
      <AppShell title="Grupo" backHref="/home">
        <p role="alert" className="mt-8 rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
          {error}
        </p>
      </AppShell>
    )
  }

  if (!detail) {
    return (
      <AppShell title="Grupo" backHref="/home">
        <p className="pt-8 text-sm text-muted-foreground">Cargando…</p>
      </AppShell>
    )
  }

  const { group, expenses, settlements } = detail
  const plan = settlementPlan(expenses, settlements, session.userId)
  const balances = computeNetBalances(expenses, settlements)
  const totalCents = expenses.reduce((sum, expense) => sum + expense.amountCents, 0)

  /** Lo que todavía falta mover para que el grupo quede en cero. */
  const outstandingCents = Object.values(balances)
    .filter(value => value > 0)
    .reduce((sum, value) => sum + value, 0)

  const settledCents = settlements
    .filter(s => s.status === 'confirmed')
    .reduce((sum, s) => sum + s.amountCents, 0)

  /** Todo lo que alguna vez hubo que saldar: lo que ya se pagó más lo que falta. */
  const debtCents = settledCents + outstandingCents
  const everyoneSettled = expenses.length > 0 && outstandingCents === 0

  return (
    <AppShell
      title={group.name}
      backHref="/home"
      width="wide"
      // En desktop el resumen y la lista de gastos se ven a la vez, en dos columnas.
      // En mobile los wrappers usan `display: contents` y todo cae en una sola columna.
      className="gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-x-12 lg:gap-y-0"
    >
      <div className="contents lg:flex lg:flex-col lg:gap-8">
      {everyoneSettled && (
        <p className="mt-4 rounded-3xl bg-credit-surface px-5 py-4 text-center font-heading text-lg font-extrabold text-credit motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500">
          Todos saldados 🎉
        </p>
      )}

      <section aria-labelledby="your-balance" className={everyoneSettled ? undefined : 'pt-4'}>
        <p id="your-balance" className="eyebrow mb-3">
          {plan.isSettled ? 'Tu balance' : plan.netCents > 0 ? 'Te deben' : 'Debés'}
        </p>

        {plan.isSettled
          ? (
              <p className="font-heading text-4xl font-extrabold text-credit">
                Estás al día ✓
              </p>
            )
          : <Amount cents={Math.abs(plan.netCents)} size="hero" tone={plan.netCents > 0 ? 'credit' : 'debit'} />}

        <p className="mt-4 text-sm text-muted-foreground">
          {formatMoney(totalCents)} gastados entre {group.memberIds.length} personas
        </p>

        {plan.owes.length > 0 && (
          <div className="mt-6">
            <Button size="pill-lg" asChild>
              <Link href={`/groups/${group.id}/settle`}>Saldar mi deuda</Link>
            </Button>
          </div>
        )}
      </section>

      {plan.owed.length > 0 && (
        <section aria-labelledby="owed-label">
          <p id="owed-label" className="eyebrow mb-3">Te tienen que pagar</p>
          <ul className="space-y-2">
            {plan.owed.map(payment => {
              const person = memberOf(detail, payment.from)
              return (
                <li
                  key={payment.from}
                  className="flex items-center gap-3 rounded-2xl bg-credit-surface px-4 py-3.5"
                >
                  <PersonAvatar user={person} size="sm" />
                  <span className="flex-1 text-sm font-bold">{person.name}</span>
                  <Amount cents={payment.amountCents} size="sm" tone="credit" />
                </li>
              )
            })}
          </ul>
        </section>
      )}
      </div>

      <div className="contents lg:flex lg:flex-col lg:gap-6">
      <section aria-labelledby="expenses-label" className="flex-1">
        <div className="mb-3 flex items-baseline justify-between">
          <p id="expenses-label" className="eyebrow">Gastos</p>
          {debtCents > 0 && (
            <p className="text-xs font-semibold text-muted-foreground">
              {formatMoney(settledCents)} / {formatMoney(debtCents)} saldado
            </p>
          )}
        </div>

        {expenses.length === 0
          ? (
              <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
                <p className="font-heading text-lg font-bold">Todavía no hay gastos</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Cargá el primero y Settld calcula el resto.
                </p>
              </div>
            )
          : (
              <ul className="space-y-3">
                {expenses.map(expense => {
                  const payer = memberOf(detail, expense.paidBy)
                  const shares = splitEqually(expense.amountCents, expense.splitBetween.length)

                  return (
                    <li key={expense.id} className="rounded-3xl bg-card px-5 py-4 ring-1 ring-border">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate font-heading text-lg font-bold">
                          {expense.description}
                        </span>
                        <Amount cents={expense.amountCents} size="md" />
                      </div>

                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        Pagó {payer.id === session.userId ? 'vos' : payer.name}
                      </p>

                      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {expense.splitBetween.map((userId, index) => {
                          const person = memberOf(detail, userId)
                          const isPayer = userId === expense.paidBy
                          // Nadie debe nada si su balance en el grupo no es negativo.
                          const isSettled = (balances[userId] ?? 0) >= 0

                          return (
                            <li key={userId} className="flex items-center gap-2.5 text-sm">
                              <PersonAvatar user={person} size="sm" />
                              <span className="flex-1 truncate font-semibold">{person.name}</span>
                              <span className="font-semibold tabular-nums text-muted-foreground">
                                {formatMoney(shares[index])}
                              </span>
                              {isPayer
                                ? <span className="text-xs font-bold text-credit">pagó</span>
                                : isSettled
                                  ? <span className="text-xs font-bold text-credit">✓&nbsp;saldado</span>
                                  : <span className="text-xs font-bold text-debit">debe</span>}
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            )}
      </section>

      <Button size="pill-lg" variant={expenses.length === 0 ? 'default' : 'secondary'} asChild>
        <Link href={`/groups/${group.id}/expenses/new`}>
          <Plus aria-hidden />
          Agregar gasto
        </Link>
      </Button>
      </div>
    </AppShell>
  )
}
