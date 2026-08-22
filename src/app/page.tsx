'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/client/use-session'

/**
 * Pantalla de bienvenida. A quien ya tiene cuenta lo manda directo al home:
 * nadie debería ver una pantalla de marketing dos veces.
 */
export default function WelcomePage () {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'ready') router.replace('/home')
  }, [status, router])

  if (status !== 'anonymous') return null

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-8 pb-10 lg:max-w-6xl lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:py-16">
      <div className="flex flex-1 flex-col justify-center lg:flex-none">
        <p className="eyebrow mb-6">Aleph Hackathon 2026</p>

        <h1 className="font-heading text-[4.25rem] leading-[0.85] font-extrabold tracking-[-0.045em] lg:text-[5.5rem]">
          Split
          <br />
          expenses.
          <br />
          <span className="text-credit">Settle</span>
          <br />
          instantly.
        </h1>

        <p className="mt-8 max-w-[30ch] text-base leading-relaxed text-muted-foreground lg:text-lg">
          Las apps de gastos te dicen quién te debe. Split hace que te paguen.
        </p>

        <div className="mt-10 hidden lg:block">
          <div className="flex items-center gap-3">
            <Button size="pill-lg" className="w-auto px-10" asChild>
              <Link href="/onboarding">Empezar</Link>
            </Button>
            <Button size="pill-lg" variant="ghost" className="w-auto px-8" asChild>
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Tu wallet se crea en este dispositivo y no sale de acá.
          </p>
        </div>
      </div>

      {/* Un vistazo al producto: en desktop el espacio de más se usa para mostrar,
          no para estirar el texto. Es markup puro, sin imágenes que cargar. */}
      <div aria-hidden className="mt-12 hidden lg:mt-0 lg:block">
        <div className="rotate-[-1.5deg] rounded-[2rem] bg-card p-7 ring-1 ring-border">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-heading text-2xl font-bold">Cena</span>
            <span className="amount text-4xl">$120.00</span>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-muted-foreground">Pagó Daniel</p>

          <ul className="mt-5 space-y-3 border-t border-border pt-5">
            {[
              { name: 'Daniel', tag: 'pagó', tone: 'text-credit' },
              { name: 'Felipe', tag: '✓ saldado', tone: 'text-credit' },
              { name: 'Sofía', tag: 'debe', tone: 'text-debit' },
              { name: 'Andrés', tag: 'debe', tone: 'text-debit' }
            ].map(person => (
              <li key={person.name} className="flex items-center gap-3 text-sm">
                <span className="size-8 shrink-0 rounded-full bg-secondary" />
                <span className="flex-1 font-semibold">{person.name}</span>
                <span className="font-semibold tabular-nums text-muted-foreground">$30.00</span>
                <span className={`w-20 text-right text-xs font-bold ${person.tone}`}>{person.tag}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 ml-10 rotate-[1deg] rounded-full bg-primary px-7 py-4 text-center font-bold text-primary-foreground">
          Felipe pagó $30 · confirmado en la blockchain
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        <Button size="pill-lg" asChild>
          <Link href="/onboarding">Empezar</Link>
        </Button>
        <Button size="pill-lg" variant="ghost" asChild>
          <Link href="/login">Ya tengo cuenta</Link>
        </Button>
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Tu wallet se crea en este dispositivo y no sale de acá.
        </p>
      </div>
    </div>
  )
}
