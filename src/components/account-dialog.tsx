'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Eye, LogOut } from 'lucide-react'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { type StoredSession, forgetEverything, readSeed } from '@/lib/client/vault'

// Contract: AccountDialog
// Props: session (required), children (el trigger)
// Variants: la frase de recuperación arranca oculta y se revela a pedido
// States: default | frase oculta | frase visible | copiado (2s) | cerrando sesión
// Accessibility: es un Dialog de Radix — foco atrapado, cierra con Escape, título y
//   descripción anunciados. Los botones de copiar confirman con texto, no sólo con color.
// Responsive: el contenido se adapta al ancho del diálogo; la frase usa grid de 3
//   columnas en mobile y 4 desde sm

/**
 * La cuenta del usuario, y el único lugar donde aparece la frase de recuperación.
 *
 * Split esconde la infraestructura por diseño, pero esconder la frase del todo sería
 * mentirle a la gente: sin ella, borrar el navegador significa perder la plata para
 * siempre. Así que no se la mostramos en la cara al crear la cuenta, pero está acá,
 * a un toque, y es lo que hace posible volver a entrar desde otro dispositivo.
 */
export function AccountDialog ({
  session,
  children
}: {
  session: StoredSession
  children: React.ReactNode
}) {
  const router = useRouter()
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState<'address' | 'phrase' | null>(null)

  const seedPhrase = revealed ? readSeed() : null

  async function copy (value: string, what: 'address' | 'phrase') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Sin permiso de portapapeles no hay nada que hacer: la frase está a la vista
      // para copiarla a mano.
    }
  }

  function handleLogout () {
    forgetEverything()
    router.replace('/')
  }

  return (
    <Dialog onOpenChange={open => { if (!open) setRevealed(false) }}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            <PersonAvatar user={session} size="md" />
            <span className="min-w-0">
              <span className="block truncate font-heading text-xl font-bold">{session.name}</span>
              <span className="block truncate text-sm font-medium text-muted-foreground">
                @{session.username}
              </span>
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Tu cuenta, tu frase de recuperación y la opción de cerrar sesión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="eyebrow mb-2">Tu wallet</p>
            <button
              type="button"
              onClick={() => copy(session.walletAddress, 'address')}
              className="flex w-full items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-left font-mono text-xs transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="min-w-0 flex-1 truncate">{session.walletAddress}</span>
              {copied === 'address'
                ? <span className="shrink-0 font-sans text-xs font-bold text-credit">copiada</span>
                : <Copy className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
            </button>
          </div>

          <div>
            <p className="eyebrow mb-2">Frase de recuperación</p>

            {!revealed
              ? (
                  <div className="rounded-2xl bg-secondary px-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Estas 12 palabras son tu cuenta. Guardalas para poder entrar desde otro
                      dispositivo — cualquiera que las tenga puede mover tu plata.
                    </p>
                    <Button
                      size="pill"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setRevealed(true)}
                    >
                      <Eye aria-hidden />
                      Mostrar
                    </Button>
                  </div>
                )
              : seedPhrase
                ? (
                    <div className="space-y-3">
                      <ol className="grid grid-cols-3 gap-1.5 rounded-2xl bg-secondary p-3 sm:grid-cols-4">
                        {seedPhrase.split(' ').map((word, index) => (
                          <li
                            key={`${index}-${word}`}
                            className="flex items-baseline gap-1.5 rounded-lg bg-card px-2 py-1.5 text-sm font-semibold"
                          >
                            <span className="text-[0.625rem] text-muted-foreground tabular-nums">
                              {index + 1}
                            </span>
                            <span className="truncate">{word}</span>
                          </li>
                        ))}
                      </ol>

                      <Button
                        size="pill"
                        variant="secondary"
                        className="w-full"
                        onClick={() => copy(seedPhrase, 'phrase')}
                      >
                        {copied === 'phrase' ? <Check aria-hidden /> : <Copy aria-hidden />}
                        {copied === 'phrase' ? 'Copiada' : 'Copiar frase'}
                      </Button>
                    </div>
                  )
                : (
                    <p className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
                      No encontramos tu frase en este dispositivo.
                    </p>
                  )}
          </div>

          <Button size="pill" variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut aria-hidden />
            Cerrar sesión
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
