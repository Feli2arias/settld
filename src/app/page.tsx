'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Hash } from 'lucide-react'
import { motion } from 'motion/react'
import { useSession } from '@/lib/client/use-session'

/**
 * La landing.
 *
 * A diferencia del resto de la app, esta página tiene colores fijos: no sigue el tema
 * del sistema. Una página de marca se ve igual siempre, como un afiche.
 *
 * A quien ya tiene cuenta lo manda directo al inicio: nadie debería ver una pantalla
 * de marketing dos veces.
 */

const DIFFERENTIATORS = [
  {
    title: 'Real settlement.',
    desc: 'We are not a grocery ledger. Others calculate; Settld collects and transfers.'
  },
  {
    title: 'No ETH, ever.',
    desc: 'Network fees are paid in USD₮. Nobody needs an absurd second token.'
  },
  {
    title: 'Self-custodial.',
    desc: 'Your wallet lives on your device. We only store your public address.'
  },
  {
    title: 'Smart crossing.',
    desc: 'If 4 people have 4 crossing expenses, the app resolves it with 3 payments, not 12.'
  }
]

/** Las personas del recibo de ejemplo. Es una maqueta: no sale de la base. */
const SAMPLE_SPLIT = [
  { initial: 'M', handle: '@mateo', amount: '$30', state: 'settled' as const },
  { initial: 'J', handle: '@julian', amount: '$30', state: 'owes' as const },
  { initial: 'A', handle: '@ana', amount: '$30', state: 'settled' as const }
]

export default function LandingPage () {
  const { status } = useSession()
  const router = useRouter()
  const [reminded, setReminded] = useState(false)

  useEffect(() => {
    if (status === 'ready') router.replace('/home')
  }, [status, router])

  if (status !== 'anonymous') return null

  return (
    <div className="relative z-0 flex min-h-screen flex-col overflow-x-hidden bg-paper text-ink selection:bg-lime selection:text-lime-ink">
      <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <span className="display text-3xl">Settld.</span>
        <Link
          href="/login"
          className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-transform hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-ink/30 focus-visible:outline-none"
        >
          Open App
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-16 px-6 py-12 md:px-12 md:py-20 lg:grid-cols-12 lg:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="lg:col-span-7"
        >
          <h1 className="display mb-8 text-6xl md:text-[90px] lg:mb-12 lg:text-[110px] xl:text-[130px]">
            Split expenses.
            <br />
            <span className="text-brand-green">Settle</span> instantly.
          </h1>

          <p className="mb-10 max-w-xl text-xl leading-relaxed font-medium opacity-80 md:text-2xl">
            Other apps tell you who owes you and stop there. Settld calculates and executes
            the payment in USD₮ directly from your wallet.
          </p>

          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Link
              href="/onboarding"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-8 py-4 text-lg font-bold text-lime-ink transition-transform hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-lime-ink/30 focus-visible:outline-none sm:w-auto"
            >
              Start now <ArrowRight className="size-5" aria-hidden />
            </Link>

            <p className="text-center text-xs font-bold tracking-widest uppercase opacity-50 sm:text-left">
              Built on
              <br />
              WDK
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="flex justify-center perspective-[1000px] lg:col-span-5 lg:justify-end"
        >
          <div className="w-full max-w-[420px] rotate-x-[2deg] rotate-y-[-5deg] rounded-[32px] border border-ink/5 bg-white p-8 shadow-[0_32px_64px_-16px_rgba(22,21,15,0.1)] transition-transform duration-500 hover:rotate-x-0 hover:rotate-y-0 md:p-10">
            <div className="mb-8">
              <p className="mb-2 text-xs font-bold tracking-widest uppercase opacity-40">
                Dinner at Osaka
              </p>
              <p className="display text-7xl tracking-tighter tabular-nums">
                $120<span className="text-4xl opacity-40">.00</span>
              </p>
            </div>

            <div className="mb-10 flex flex-col gap-2">
              {SAMPLE_SPLIT.map(person => (
                <div
                  key={person.handle}
                  className={
                    person.state === 'owes'
                      ? '-mx-4 flex items-center justify-between rounded-xl border-b border-ink/5 bg-brand-red/5 px-4 py-3'
                      : 'flex items-center justify-between border-b border-ink/5 py-3'
                  }
                >
                  <span className="flex items-center gap-3 font-semibold">
                    <span
                      aria-hidden
                      className={
                        person.state === 'owes'
                          ? 'flex size-8 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-red shadow-sm'
                          : 'flex size-8 items-center justify-center rounded-full bg-ink/5 text-xs font-bold'
                      }
                    >
                      {person.initial}
                    </span>
                    {person.handle}
                  </span>

                  {person.state === 'settled'
                    ? (
                        <span className="flex items-center gap-3">
                          <span className="display text-2xl tabular-nums">{person.amount}</span>
                          <span className="flex items-center gap-1 rounded bg-brand-green/10 px-2 py-1 text-[10px] font-bold tracking-widest text-brand-green uppercase">
                            <Check className="size-3" aria-hidden /> Settled
                          </span>
                        </span>
                      )
                    : (
                        <span className="flex flex-col items-end">
                          <span className="display text-2xl text-brand-red tabular-nums">
                            {person.amount}
                          </span>
                          <span className="text-[10px] font-bold tracking-widest text-brand-red uppercase">
                            Owes
                          </span>
                        </span>
                      )}
                </div>
              ))}

              <div className="flex items-center justify-between py-3">
                <span className="flex items-center gap-3 font-semibold">
                  <span
                    aria-hidden
                    className="flex size-8 items-center justify-center rounded-full bg-lime text-xs font-bold text-lime-ink"
                  >
                    Y
                  </span>
                  @you <span className="font-normal opacity-40">(paid)</span>
                </span>
                <span className="display text-2xl text-brand-green tabular-nums">+$90</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setReminded(true)
                setTimeout(() => setReminded(false), 3000)
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ink/30 focus-visible:outline-none ${
                reminded ? 'bg-brand-green text-white' : 'bg-ink text-paper shadow-xl hover:shadow-2xl'
              }`}
            >
              {reminded
                ? <><Check className="size-5" aria-hidden /> Reminder sent</>
                : 'Remind @julian'}
            </button>
          </div>
        </motion.div>
      </section>

      <section className="mt-12 border-y border-ink/10 bg-white md:mt-24">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 divide-y divide-ink/10 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
          {DIFFERENTIATORS.map(item => (
            <div key={item.title} className="p-8 transition-colors hover:bg-paper/50 md:p-12">
              <p className="display mb-4 text-3xl text-ink md:text-4xl">{item.title}</p>
              <p className="text-lg leading-relaxed font-medium opacity-60">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mx-auto flex max-w-[1100px] flex-col items-center px-6 py-32 text-center md:px-12 md:py-48"
      >
        <h2 className="display mb-12 text-4xl text-ink md:text-6xl lg:text-7xl">
          &ldquo;Don&rsquo;t teach people how to use crypto. Build products where they
          don&rsquo;t need to know they&rsquo;re using it.&rdquo;
        </h2>

        <Link
          href="/onboarding"
          className="rounded-full bg-lime px-12 py-6 text-xl font-bold text-lime-ink shadow-[0_16px_32px_-8px_rgba(195,240,78,0.4)] transition-transform hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-lime-ink/30 focus-visible:outline-none"
        >
          Create free account
        </Link>
      </motion.section>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-ink/10 px-6 py-8 text-sm font-bold tracking-widest uppercase opacity-40 sm:flex-row md:px-12">
        <span>© 2026 Settld</span>
        <span className="flex items-center gap-2">
          <Hash className="size-4" aria-hidden /> Verifiable Receipts
        </span>
      </footer>
    </div>
  )
}
