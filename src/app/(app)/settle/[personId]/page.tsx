'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { Amount } from '@/components/amount'
import { AppShell } from '@/components/app-shell'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/client/api'
import { personIn, useLedger } from '@/lib/client/use-ledger'
import { useRequireSession } from '@/lib/client/use-session'
import { readSeed } from '@/lib/client/vault'
import { debtWith } from '@/lib/split/dashboard'
import type { User } from '@/lib/split/types'
import { explorerTxUrl } from '@/lib/wdk/config'
import { describeWalletError } from '@/lib/wdk/errors'
import { formatMoney } from '@/lib/wdk/money'
import { type TransferPreview, previewTransfer, sendTransfer } from '@/lib/wdk/wallet'

type Stage =
  | { name: 'quoting' }
  | { name: 'preview', quote: TransferPreview }
  | { name: 'paying' }
  | { name: 'done', txHash: string | null }
  | { name: 'error', message: string }

/**
 * Paying one person what you owe them.
 *
 * This is the only screen where Settld touches real money, so it follows a strict rule:
 * nothing goes to the network until you have seen the exact amount, the network cost and
 * what your balance will look like, and have pressed confirm.
 *
 * You only ever sign transfers leaving your own wallet. Settld never pays on somebody
 * else's behalf — it cannot, and that is the point of the whole architecture.
 */
export default function SettlePage ({ params }: PageProps<'/settle/[personId]'>) {
  const { personId } = use(params)
  const session = useRequireSession()
  const { ledger, reload } = useLedger(session?.userId)
  const [stage, setStage] = useState<Stage>({ name: 'quoting' })

  const debt = ledger && session ? debtWith(ledger, session.userId, personId) : null
  const owedCents = debt && debt.netCents < 0 ? -debt.netCents : 0
  const payee: User | null = ledger ? personIn(ledger.people, personId) : null

  /** Step 1: ask WDK to simulate the transfer without executing it. */
  const startQuote = useCallback(async (recipient: string, amountCents: number) => {
    const seedPhrase = readSeed()
    if (!seedPhrase) {
      setStage({ name: 'error', message: "We couldn't find your wallet on this device" })
      return
    }

    setStage({ name: 'quoting' })

    try {
      setStage({ name: 'preview', quote: await previewTransfer(seedPhrase, recipient, amountCents) })
    } catch (err) {
      // The user gets a sentence; whoever is debugging the demo gets the real thing.
      console.warn('[settle] could not quote the transfer', err)
      setStage({ name: 'error', message: describeWalletError(err, "We couldn't prepare the payment") })
    }
  }, [])

  useEffect(() => {
    if (stage.name !== 'quoting' || !payee || owedCents <= 0) return
    void startQuote(payee.walletAddress, owedCents)
    // Quoting once is the point: re-running it on every render would hammer the bundler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payee?.walletAddress, owedCents])

  /** Step 2: actually execute, and only then record it. */
  async function confirmAndPay () {
    const seedPhrase = readSeed()
    if (!seedPhrase || !session || !payee) return

    setStage({ name: 'paying' })

    // Filled in as soon as the transfer leaves for the network, before waiting for
    // confirmation: if the user closes the app right then, the payment is still on record.
    let settlementId: string | null = null

    try {
      const receipt = await sendTransfer(
        seedPhrase,
        payee.walletAddress,
        owedCents,
        async userOpHash => {
          const settlement = await api.createSettlement({
            from: session.userId,
            to: personId,
            amountCents: owedCents,
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
          message: "The payment went out but the network hasn't confirmed it yet. Come back in a minute to see it."
        })
        return
      }

      await reload()
      setStage({ name: 'done', txHash: receipt.txHash })
    } catch (err) {
      // If we already recorded the payment, the money left: we don't lie and say it failed.
      if (settlementId) {
        setStage({
          name: 'error',
          message: 'The payment went out but we lost track of it. Come back in a minute to see it.'
        })
        return
      }

      console.warn('[settle] the transfer did not go out', err)
      setStage({ name: 'error', message: describeWalletError(err, 'The payment could not be completed') })
    }
  }

  const back = `/people/${personId}`

  if (!session || !ledger || !payee) {
    return (
      <AppShell title="Settle up" backHref={back}>
        <p className="pt-8 text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    )
  }

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

          <p className="eyebrow mb-4">Payment complete</p>
          <Amount cents={owedCents} size="hero" />

          <p className="mt-6 text-base font-semibold">You paid {payee.name}</p>

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
          <Link href="/home">Done</Link>
        </Button>
      </AppShell>
    )
  }

  if (stage.name === 'paying') {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Loader2 className="size-8 animate-spin text-credit" aria-hidden />
          <div>
            <p className="font-heading text-2xl font-bold">Sending the payment</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Waiting for the network to confirm. Don&rsquo;t close the app.
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  if (stage.name === 'error') {
    return (
      <AppShell title="Settle up" backHref={back}>
        <div className="flex flex-1 flex-col justify-center gap-6">
          <p role="alert" className="rounded-3xl bg-debit-surface px-5 py-4 text-sm font-semibold text-debit">
            {stage.message}
          </p>
          <Button
            size="pill-lg"
            variant="secondary"
            onClick={() => startQuote(payee.walletAddress, owedCents)}
          >
            Try again
          </Button>
        </div>
      </AppShell>
    )
  }

  if (owedCents <= 0) {
    return (
      <AppShell title="Settle up" backHref={back}>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="font-heading text-4xl font-extrabold text-credit">You&rsquo;re all settled ✓</p>
          <p className="mt-3 text-sm text-muted-foreground">
            You don&rsquo;t owe {payee.name} anything.
          </p>
        </div>
        <Button size="pill-lg" variant="secondary" className="mt-10" asChild>
          <Link href="/home">Back home</Link>
        </Button>
      </AppShell>
    )
  }

  if (stage.name === 'quoting') {
    return (
      <AppShell title="Settle up" backHref={back}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Preparing the payment…</p>
        </div>
      </AppShell>
    )
  }

  const { quote } = stage

  return (
    <AppShell title="Settle up" backHref={back} className="justify-between">
      <div className="flex-1 pt-6">
        <p className="eyebrow mb-3">You&rsquo;re paying</p>

        <div className="flex items-center gap-3">
          <PersonAvatar user={payee} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-heading text-2xl font-bold">{payee.name}</p>
            <p className="truncate text-sm text-muted-foreground">@{payee.username}</p>
          </div>
        </div>

        <div className="mt-10">
          <Amount cents={owedCents} size="hero" />
        </div>

        <dl className="mt-10 space-y-3 rounded-3xl bg-card px-5 py-5 ring-1 ring-border">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-semibold text-muted-foreground">Your balance</dt>
            <dd className="text-sm font-bold tabular-nums">{formatMoney(quote.balanceCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-sm font-semibold text-muted-foreground">Network cost</dt>
            <dd className="text-sm font-bold tabular-nums">{formatMoney(quote.feeCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="text-sm font-semibold text-muted-foreground">You&rsquo;ll have left</dt>
            <dd className="text-sm font-bold tabular-nums">{formatMoney(quote.balanceAfterCents)}</dd>
          </div>
        </dl>

        {!quote.hasEnough && (
          <p role="alert" className="mt-4 rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
            Not enough balance. Add money from the home screen and come back.
          </p>
        )}
      </div>

      <div className="space-y-4 pt-8">
        <Button size="pill-lg" disabled={!quote.hasEnough} onClick={confirmAndPay}>
          Confirm and pay
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Leaves your wallet. Powered by WDK.
        </p>
      </div>
    </AppShell>
  )
}
