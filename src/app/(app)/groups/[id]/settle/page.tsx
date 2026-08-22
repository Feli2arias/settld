'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Amount } from '@/components/amount'
import { AppShell } from '@/components/app-shell'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/client/api'
import { memberOf, useGroup } from '@/lib/client/use-group'
import { useRequireSession } from '@/lib/client/use-session'
import { readSeed } from '@/lib/client/vault'
import { settlementPlan } from '@/lib/split/balances'
import type { Payment, User } from '@/lib/split/types'
import { explorerTxUrl } from '@/lib/wdk/config'
import { formatMoney } from '@/lib/wdk/money'
import { type TransferPreview, previewTransfer, sendTransfer } from '@/lib/wdk/wallet'

type Stage =
  | { name: 'choosing' }
  | { name: 'quoting', payment: Payment, payee: User }
  | { name: 'preview', payment: Payment, payee: User, quote: TransferPreview }
  | { name: 'paying', payment: Payment, payee: User }
  | { name: 'done', payment: Payment, payee: User, txHash: string | null }
  | { name: 'error', message: string }

/**
 * Settle Up.
 *
 * Es la única pantalla donde Settld toca plata de verdad, así que sigue una regla
 * estricta: nada se manda a la red sin que el usuario haya visto antes el monto
 * exacto, el costo de red y cómo le queda el saldo, y haya apretado confirmar.
 *
 * Un usuario sólo firma transferencias que salen de SU wallet. Settld nunca paga
 * en nombre de otro.
 */
export default function SettlePage ({ params }: PageProps<'/groups/[id]/settle'>) {
  const { id } = use(params)
  const session = useRequireSession()
  const { detail, reload } = useGroup(id)
  const [stage, setStage] = useState<Stage>({ name: 'choosing' })

  const plan = detail && session ? settlementPlan(detail.expenses, detail.settlements, session.userId) : null

  /** Paso 1: pedirle a WDK una simulación de la transferencia, sin ejecutarla. */
  const startQuote = useCallback(async (payment: Payment, payee: User) => {
    const seedPhrase = readSeed()
    if (!seedPhrase) {
      setStage({ name: 'error', message: 'No encontramos tu wallet en este dispositivo' })
      return
    }

    setStage({ name: 'quoting', payment, payee })

    try {
      const quote = await previewTransfer(seedPhrase, payee.walletAddress, payment.amountCents)
      setStage({ name: 'preview', payment, payee, quote })
    } catch (err) {
      setStage({ name: 'error', message: err instanceof Error ? err.message : 'No pudimos preparar el pago' })
    }
  }, [])

  // Si sólo hay una deuda, no tiene sentido hacer elegir: vamos directo al preview.
  useEffect(() => {
    if (stage.name !== 'choosing' || !plan || !detail) return
    if (plan.owes.length !== 1) return

    const [payment] = plan.owes
    void startQuote(payment, memberOf(detail, payment.to) as User)
  }, [stage.name, plan, detail, startQuote])

  /** Paso 2: ejecutar de verdad, y recién ahí anotarlo. */
  async function confirmAndPay (payment: Payment, payee: User) {
    const seedPhrase = readSeed()
    if (!seedPhrase || !session) return

    setStage({ name: 'paying', payment, payee })

    // Se completa apenas la transferencia sale a la red, antes de esperar la
    // confirmación: si el usuario cierra la app justo ahí, el pago igual queda anotado.
    let settlementId: string | null = null

    try {
      const receipt = await sendTransfer(
        seedPhrase,
        payee.walletAddress,
        payment.amountCents,
        async userOpHash => {
          const settlement = await api.createSettlement({
            groupId: id,
            from: session.userId,
            to: payee.id,
            amountCents: payment.amountCents,
            userOpHash
          })
          settlementId = settlement.id
        }
      )

      if (settlementId && receipt.success) {
        await api.updateSettlement(settlementId, {
          status: 'confirmed',
          txHash: receipt.txHash ?? undefined
        })
      }

      if (!receipt.success) {
        setStage({
          name: 'error',
          message: 'El pago salió pero la red todavía no lo confirmó. Volvé al grupo en un minuto para verlo.'
        })
        return
      }

      await reload()
      setStage({ name: 'done', payment, payee, txHash: receipt.txHash })
    } catch (err) {
      // Si ya habíamos registrado el pago, la plata salió: no mentimos diciendo que falló.
      if (settlementId) {
        setStage({
          name: 'error',
          message: 'El pago salió pero perdimos el hilo. Volvé al grupo en un minuto para verlo.'
        })
        return
      }
      setStage({ name: 'error', message: err instanceof Error ? err.message : 'El pago no se pudo completar' })
    }
  }

  if (!session || !detail || !plan) {
    return (
      <AppShell title="Saldar" backHref={`/groups/${id}`}>
        <p className="pt-8 text-sm text-muted-foreground">Cargando…</p>
      </AppShell>
    )
  }

  // --- Pago completado ---
  if (stage.name === 'done') {
    return (
      <AppShell className="justify-between">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span
            aria-hidden
            className="mb-8 flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500"
          >
            <Check className="size-10" strokeWidth={3} />
          </span>

          <p className="eyebrow mb-4">Pago completado</p>
          <Amount cents={stage.payment.amountCents} size="hero" />

          <p className="mt-6 text-base font-semibold">
            Le pagaste a {stage.payee.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{detail.group.name}</p>

          {stage.txHash && (
            <a
              href={explorerTxUrl(stage.txHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 font-mono text-xs font-semibold transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {stage.txHash.slice(0, 10)}…{stage.txHash.slice(-6)}
              <ArrowRight className="size-3" aria-hidden />
            </a>
          )}
        </div>

        <Button size="pill-lg" className="mt-10" asChild>
          <Link href={`/groups/${id}`}>Listo</Link>
        </Button>
      </AppShell>
    )
  }

  // --- Enviando a la red ---
  if (stage.name === 'paying') {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Loader2 className="size-8 animate-spin text-credit" aria-hidden />
          <div>
            <p className="font-heading text-2xl font-bold">Enviando el pago</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Esperando la confirmación de la red. No cierres la app.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  // --- Algo falló ---
  if (stage.name === 'error') {
    return (
      <AppShell title="Saldar" backHref={`/groups/${id}`}>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <p role="alert" className="rounded-3xl bg-debit-surface px-5 py-4 text-sm font-semibold text-debit">
            {stage.message}
          </p>
          <Button size="pill-lg" variant="secondary" onClick={() => setStage({ name: 'choosing' })}>
            Volver a intentar
          </Button>
        </div>
      </AppShell>
    )
  }

  // --- Nada que saldar ---
  if (plan.owes.length === 0) {
    return (
      <AppShell title="Saldar" backHref={`/groups/${id}`}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-heading text-4xl font-extrabold text-credit">Estás al día ✓</p>
          <p className="mt-3 text-sm text-muted-foreground">No debés nada en este grupo.</p>
        </div>
        <Button size="pill-lg" variant="secondary" className="mt-10" asChild>
          <Link href={`/groups/${id}`}>Volver al grupo</Link>
        </Button>
      </AppShell>
    )
  }

  // --- Preparando el preview ---
  if (stage.name === 'quoting') {
    return (
      <AppShell title="Saldar" backHref={`/groups/${id}`}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Preparando el pago…</p>
        </div>
      </AppShell>
    )
  }

  // --- Preview: el usuario ve exactamente qué va a pasar ---
  if (stage.name === 'preview') {
    const { payment, payee, quote } = stage

    return (
      <AppShell title="Saldar" backHref={`/groups/${id}`} className="justify-between">
        <div className="flex-1 pt-6">
          <p className="eyebrow mb-3">Le pagás a</p>

          <div className="flex items-center gap-3">
            <PersonAvatar user={payee} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-heading text-2xl font-bold">{payee.name}</p>
              <p className="truncate text-sm text-muted-foreground">@{payee.username}</p>
            </div>
          </div>

          <div className="mt-10">
            <Amount cents={payment.amountCents} size="hero" />
          </div>

          <dl className="mt-10 space-y-3 rounded-3xl bg-card px-5 py-5 ring-1 ring-border">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm font-semibold text-muted-foreground">Tu saldo</dt>
              <dd className="text-sm font-bold tabular-nums">{formatMoney(quote.balanceCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm font-semibold text-muted-foreground">Costo de red</dt>
              <dd className="text-sm font-bold tabular-nums">{formatMoney(quote.feeCents)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
              <dt className="text-sm font-semibold text-muted-foreground">Te queda</dt>
              <dd className="text-sm font-bold tabular-nums">{formatMoney(quote.balanceAfterCents)}</dd>
            </div>
          </dl>

          {!quote.hasEnough && (
            <p role="alert" className="mt-4 rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
              No te alcanza el saldo. Cargá saldo desde el inicio y volvé.
            </p>
          )}
        </div>

        <div className="space-y-4 pt-8">
          <Button
            size="pill-lg"
            disabled={!quote.hasEnough}
            onClick={() => confirmAndPay(payment, payee)}
          >
            Confirmar y pagar
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sale de tu wallet. Powered by WDK.
          </p>
        </div>
      </AppShell>
    )
  }

  // --- Varias deudas: el usuario elige cuál saldar ---
  return (
    <AppShell title="Saldar" backHref={`/groups/${id}`} className="gap-6">
      <div className="pt-4">
        <p className="eyebrow mb-3">Debés en total</p>
        <Amount cents={Math.abs(plan.netCents)} size="hero" tone="debit" />
        <p className="mt-4 text-sm text-muted-foreground">
          Se salda con {plan.owes.length} {plan.owes.length === 1 ? 'pago' : 'pagos'}.
        </p>
      </div>

      <ul className="space-y-3">
        {plan.owes.map(payment => {
          const payee = memberOf(detail, payment.to) as User

          return (
            <li key={payment.to}>
              <button
                type="button"
                onClick={() => startQuote(payment, payee)}
                className="flex w-full items-center gap-3 rounded-3xl bg-card px-5 py-4 text-left ring-1 ring-border transition-all motion-safe:hover:scale-[1.01] hover:ring-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <PersonAvatar user={payee} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-lg font-bold">{payee.name}</span>
                  <span className="block text-xs text-muted-foreground">@{payee.username}</span>
                </span>
                <Amount cents={payment.amountCents} size="md" tone="debit" />
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </AppShell>
  )
}
