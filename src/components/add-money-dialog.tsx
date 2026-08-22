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
// Props: address (required), onFunded (callback tras acreditar), children (el trigger)
// Variants: menú → tarjeta | recibir | fondos de prueba
// States: menu | card (elegir monto) | opening | receive | test (cargando/error) | copiado
// Accessibility: Dialog de Radix (foco atrapado, Escape cierra). El QR tiene alt y la
//   address está en texto para quien no pueda escanear.
// Responsive: montos en grilla de 3; el QR se limita a 12rem para entrar en mobile chico

type View = 'menu' | 'card' | 'receive' | 'test'

/** Montos sugeridos, en centavos. */
const AMOUNTS = [2_000, 5_000, 10_000]

/**
 * Cargar saldo.
 *
 * Toda la pantalla está escrita para alguien que no sabe —ni le importa— que hay una
 * blockchain abajo: se compra con tarjeta, o se pide que te manden mostrando un código.
 * La address aparece sólo como respaldo de quien escanea, nunca como el camino principal.
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

  // El QR se arma recién cuando hace falta, así la librería no entra en el bundle inicial.
  useEffect(() => {
    if (view !== 'receive' || qr) return

    void import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(address, { margin: 1, width: 320, color: { dark: '#17170f', light: '#ffffff' } })
        .then(setQr)
        .catch(() => setError('No pudimos generar el código'))
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
      // Sin portapapeles no hay nada que hacer: la address está a la vista.
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
      setError(err instanceof Error ? err.message : 'No pudimos abrir el pago')
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
      setError(err instanceof Error ? err.message : 'No pudimos cargar saldo')
    } finally {
      setBusy(false)
    }
  }

  const title = {
    menu: 'Cargar saldo',
    card: 'Comprar con tarjeta',
    receive: 'Que te manden plata',
    test: 'Fondos de prueba'
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
            {view === 'menu' && 'Elegí cómo querés sumar plata a tu cuenta.'}
            {view === 'card' && 'Se paga como cualquier compra online. Cae directo en tu cuenta.'}
            {view === 'receive' && 'Mostrale este código a quien te va a mandar la plata.'}
            {view === 'test' && 'Plata de mentira para probar la app, sin costo.'}
          </DialogDescription>
        </DialogHeader>

        {view === 'menu' && (
          <div className="space-y-2">
            <MethodRow
              icon={<CreditCard aria-hidden />}
              title="Con tarjeta"
              subtitle={cardAvailable ? 'Débito o crédito' : 'No disponible por ahora'}
              disabled={!cardAvailable}
              onClick={() => setView('card')}
            />
            <MethodRow
              icon={<QrCode aria-hidden />}
              title="Que te manden"
              subtitle="Mostrá tu código de cobro"
              onClick={() => setView('receive')}
            />
            <MethodRow
              icon={<Sparkles aria-hidden />}
              title="Fondos de prueba"
              subtitle={`${formatMoney(5000)} para probar`}
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
              Continuar
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
                      alt="Código para recibir plata en tu cuenta"
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
                {copied ? 'Copiado ✓' : 'Tocá para copiar'}
              </span>
            </button>
          </div>
        )}

        {view === 'test' && (
          <Button size="pill-lg" onClick={requestTestFunds} disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {busy ? 'Acreditando…' : `Sumar ${formatMoney(5000)}`}
          </Button>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
            {error}
          </p>
        )}

        {view !== 'menu' && (
          <Button size="pill" variant="ghost" className="w-full" onClick={reset}>
            Volver
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
  disabled,
  onClick
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-2xl bg-card px-4 py-4 text-left ring-1 ring-border transition-all disabled:opacity-50 motion-safe:not-disabled:hover:scale-[1.01] not-disabled:hover:ring-ring/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary [&_svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      {!disabled && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </button>
  )
}
