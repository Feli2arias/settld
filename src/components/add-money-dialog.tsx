'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, CreditCard, Loader2, QrCode, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { formatMoney } from '@/lib/wdk/money'
import { buildBuyUrl, isOnrampAvailable } from '@/lib/wdk/onramp'

// Contract: AddMoneyDialog
// Props: address (required), onFunded (callback after funds land), children (the trigger)
// Variants: menu → card | receive | test funds. The card row only exists when an
//   on-ramp key is configured.
// States: menu | card (pick amount) | opening | receive | test (loading/error) | copied
// Accessibility: Radix Dialog (focus trapped, Escape closes). The QR has alt text and the
//   address is written out for anyone who can't scan.
// Responsive: amounts in a 3-column grid; the QR caps at 12rem to fit small phones

type View = 'menu' | 'card' | 'receive' | 'test'

/** Suggested amounts, in cents. */
const AMOUNTS = [2_000, 5_000, 10_000]

/**
 * Adding money.
 *
 * The whole screen is written for someone who doesn't know — and doesn't care — that
 * there's a blockchain underneath: you buy with a card, or you ask to be paid by showing
 * a code. The address only shows up as a fallback for whoever scans, never as the main path.
 */
export function AddMoneyDialog ({
  address,
  onFunded,
  children
}: {
  address: string
  onFunded?: () => void | Promise<void>
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [amountCents, setAmountCents] = useState(AMOUNTS[1])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const cardAvailable = isOnrampAvailable()

  // The QR is built only when needed, so the library stays out of the initial bundle.
  useEffect(() => {
    if (view !== 'receive' || qr) return

    void import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(address, { margin: 1, width: 320, color: { dark: '#17170f', light: '#ffffff' } })
        .then(setQr)
        .catch(() => setError("We couldn't generate the code"))
    )
  }, [view, qr, address])

  function reset () {
    setView('menu')
    setError(null)
    setBusy(false)
  }

  async function copyAddress () {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Without a clipboard there's nothing to do: the address is on screen.
    }
  }

  async function openCheckout () {
    setBusy(true)
    setError(null)

    try {
      const url = await buildBuyUrl(address, amountCents)
      window.open(url, '_blank', 'noopener,noreferrer')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't open the payment")
    } finally {
      setBusy(false)
    }
  }

  async function requestTestFunds () {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address })
      })
      const payload = await response.json()
      if (payload.error) throw new Error(payload.error)

      await onFunded?.()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't add money")
    } finally {
      setBusy(false)
    }
  }

  const title = {
    menu: 'Add money',
    card: 'Buy with a card',
    receive: 'Get paid',
    test: 'Test funds'
  }[view]

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-left font-heading text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-left">
            {view === 'menu' && 'Choose how you want to add money to your account.'}
            {view === 'card' && 'Pay like any online purchase. It lands straight in your account.'}
            {view === 'receive' && 'Show this code to whoever is sending you money.'}
            {view === 'test' && 'Play money to try the app, at no cost.'}
          </DialogDescription>
        </DialogHeader>

        {view === 'menu' && (
          <div className="space-y-2">
            {/* No key, no row. A permanently greyed-out option is worse than one that
                isn't there: it takes up the first slot and leads nowhere. */}
            {cardAvailable && (
              <MethodRow
                icon={<CreditCard aria-hidden />}
                title="With a card"
                subtitle="Debit or credit"
                onClick={() => setView('card')}
              />
            )}
            <MethodRow
              icon={<QrCode aria-hidden />}
              title="Get paid"
              subtitle="Show your payment code"
              onClick={() => setView('receive')}
            />
            <MethodRow
              icon={<Sparkles aria-hidden />}
              title="Test funds"
              subtitle={`${formatMoney(5000)} to try it out`}
              onClick={() => setView('test')}
            />
          </div>
        )}

        {view === 'card' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {AMOUNTS.map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmountCents(value)}
                  aria-pressed={amountCents === value}
                  className={`rounded-2xl py-3 text-base font-bold transition-all motion-safe:active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
                    amountCents === value ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  }`}
                >
                  {formatMoney(value)}
                </button>
              ))}
            </div>

            <Button size="pill-lg" onClick={openCheckout} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Continue
            </Button>
          </div>
        )}

        {view === 'receive' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              {qr
                ? (
                    <img
                      src={qr}
                      alt="Code to receive money into your account"
                      className="size-48 rounded-2xl ring-1 ring-border"
                    />
                  )
                : <div className="flex size-48 items-center justify-center rounded-2xl bg-secondary">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
                  </div>}
            </div>

            <button
              type="button"
              onClick={copyAddress}
              className="w-full rounded-2xl bg-secondary px-4 py-3 text-center transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="block break-all font-mono text-xs">{address}</span>
              <span className="mt-1 block text-xs font-bold text-muted-foreground">
                {copied ? 'Copied ✓' : 'Tap to copy'}
              </span>
            </button>
          </div>
        )}

        {view === 'test' && (
          <Button size="pill-lg" onClick={requestTestFunds} disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {busy ? 'Adding…' : `Add ${formatMoney(5000)}`}
          </Button>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
            {error}
          </p>
        )}

        {view !== 'menu' && (
          <Button size="pill" variant="ghost" className="w-full" onClick={reset}>
            Back
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MethodRow ({
  icon,
  title,
  subtitle,
  onClick
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-card px-4 py-4 text-left ring-1 ring-border transition-all motion-safe:hover:scale-[1.01] hover:ring-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary [&_svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}
