'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Hash, Lock, ShieldCheck, Zap } from 'lucide-react'
import { useSession } from '@/lib/client/use-session'

/**
 * The landing page.
 *
 * A collage of things left on a table — the receipt, a strip of tape, a rubber stamp —
 * because the product is about a real bill between real friends, and a flat gradient
 * hero would say nothing.
 *
 * Nothing here animates. The page is a poster: it should be fully there the instant it
 * loads, not assemble itself in front of the reader.
 *
 * Unlike the rest of the app, this page has fixed colours: it doesn't follow the system
 * theme. A brand page looks the same always.
 *
 * Anyone who already has an account is sent straight to the home screen — nobody should
 * see a marketing page twice. But the markup still renders on the server, and isn't
 * hidden while we read the session, because otherwise whoever shares the link gets no
 * preview and the first paint is blank.
 */

const STEPS = [
  { n: '1', text: 'You put in what\nyou paid for.' },
  { n: '2', text: 'Settld works out\nwho owes what.' },
  { n: '3', text: 'Everyone pays.\nDone.' }
]

const TRUST = [
  {
    icon: Lock,
    title: 'Your money is yours',
    desc: 'We never custody your balance. Your wallet lives on your device.'
  },
  {
    icon: Zap,
    title: 'Instant payments',
    desc: "The money moves right away. It isn't an IOU."
  },
  {
    icon: ShieldCheck,
    title: 'No ETH, ever',
    desc: 'Network fees are paid in USD₮. No absurd second token.'
  }
]

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
    title: 'One number per person.',
    desc: 'Debts running both ways cancel out. If you owe them and they owe you, all that is left is the difference.'
  }
]

export function Landing () {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'ready') router.replace('/home')
  }, [status, router])

  if (status === 'ready') return null

  return (
    <div className="relative z-0 flex min-h-screen flex-col overflow-x-hidden bg-paper text-ink selection:bg-lime selection:text-lime-ink">
      <header className="relative z-20 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-6 px-6 py-6 md:px-12 md:py-8">
        <span className="display text-3xl">Settld.</span>

        <nav aria-label="Sections" className="hidden gap-8 text-sm font-semibold md:flex">
          <a href="#how-it-works" className="transition-opacity hover:opacity-60">How it works</a>
          <a href="#security" className="transition-opacity hover:opacity-60">Security</a>
        </nav>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-paper transition-transform hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-ink/30 focus-visible:outline-none"
        >
          Open App <ArrowRight className="size-4" aria-hidden />
        </Link>
      </header>

      <section className="relative">
        {/* The dark half the collage sits against. It bleeds off the right edge so the
            receipt can straddle the boundary between paper and ink. */}
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[42%] bg-ink lg:block" />

        <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-14 px-6 pt-6 pb-16 md:px-12 lg:grid-cols-12 lg:gap-10 lg:pb-24">
          <div className="lg:col-span-7">
            <h1 className="display text-6xl md:text-[84px] lg:text-[92px] xl:text-[104px]">
              Split expenses.
              <br />
              <Highlight rotate="-1.6deg">Settle</Highlight>{' '}
              <Highlight rotate="1.1deg">instantly.</Highlight>
            </h1>

            <p className="mt-8 max-w-xl text-lg leading-relaxed font-medium opacity-75 md:text-xl">
              Other apps tell you who owes you and stop there. Settld calculates and executes
              the payment in USD₮ directly from your wallet.
            </p>

            <ol id="how-it-works" className="mt-10 flex flex-wrap items-start gap-x-5 gap-y-6 scroll-mt-24">
              {STEPS.map((step, index) => (
                <li key={step.n} className="flex items-start gap-5">
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-lime text-[11px] font-bold text-lime-ink"
                    >
                      {step.n}
                    </span>
                    <span className="text-sm leading-snug font-semibold whitespace-pre-line">
                      {step.text}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <ArrowRight className="mt-1 hidden size-4 shrink-0 opacity-30 sm:block" aria-hidden />
                  )}
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link
                href="/onboarding"
                className="brush group flex items-center gap-3 bg-ink px-10 py-5 text-lg font-bold text-lime transition-transform hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-ink/30 focus-visible:outline-none"
              >
                Start now
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>

              <Link
                href="/login"
                className="text-base font-bold underline decoration-2 underline-offset-8 transition-opacity hover:opacity-60 focus-visible:ring-3 focus-visible:ring-ink/30 focus-visible:outline-none"
              >
                I already have an account
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center lg:col-span-5 lg:justify-end">
            <div className="relative w-full max-w-[420px] pb-16 lg:max-w-[480px] lg:pb-20">
              <Image
                src="/receipt.png"
                alt="A receipt for dinner split between four friends: two have settled, two still owe."
                width={1086}
                height={1448}
                priority
                sizes="(max-width: 1024px) 90vw, 480px"
                className="h-auto w-full drop-shadow-[0_28px_50px_rgba(22,21,15,0.35)]"
              />
              <TapeStrip />
              <Stamp />
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Why Settld" className="border-y border-ink/10 bg-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 py-10 md:grid-cols-3 md:px-12">
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <Icon className="mt-0.5 size-6 shrink-0" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed opacity-60">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="scroll-mt-24 border-b border-ink/10">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 divide-y divide-ink/10 md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4">
          {DIFFERENTIATORS.map(item => (
            <div key={item.title} className="p-8 transition-colors hover:bg-white/60 md:p-12">
              <p className="display mb-4 text-3xl text-ink md:text-4xl">{item.title}</p>
              <p className="text-lg leading-relaxed font-medium opacity-60">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-[1100px] flex-col items-center px-6 py-28 text-center md:px-12 md:py-40">
        <h2 className="display mb-12 text-4xl text-ink md:text-6xl lg:text-7xl">
          &ldquo;Don&rsquo;t teach people how to use crypto. Build products where they
          don&rsquo;t need to know they&rsquo;re using it.&rdquo;
        </h2>

        <Link
          href="/onboarding"
          className="brush bg-lime px-12 py-6 text-xl font-bold text-lime-ink shadow-[0_16px_32px_-8px_rgba(195,240,78,0.5)] transition-transform hover:scale-105 active:scale-95 focus-visible:ring-3 focus-visible:ring-lime-ink/30 focus-visible:outline-none"
        >
          Create free account
        </Link>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 border-t border-ink/10 px-6 py-8 text-sm font-bold tracking-widest uppercase opacity-40 sm:flex-row md:px-12">
        <span>© 2026 Settld</span>
        <span className="flex items-center gap-2">
          <Hash className="size-4" aria-hidden /> Verifiable receipts
        </span>
      </footer>
    </div>
  )
}

/**
 * One pass of a highlighter, tilted.
 *
 * It wraps a single word on purpose. A rotated block behind a whole phrase would cover
 * every line the phrase wraps to and turn into one big slab; word by word, each stroke
 * stays the size of its word at any screen width — and the slightly different angles
 * read as a hand, not a shape tool.
 */
function Highlight ({ children, rotate }: { children: React.ReactNode, rotate: string }) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden
        className="absolute inset-x-[-0.1em] top-[0.16em] bottom-[0.06em] bg-lime"
        style={{ transform: `rotate(${rotate})`, borderRadius: '0.5rem 0.9rem 0.4rem 0.8rem' }}
      />
      <span className="relative">{children}</span>
    </span>
  )
}

/** The strip of tape slapped over the corner the moment the payment lands. */
function TapeStrip () {
  return (
    <div
      aria-hidden
      className="tape absolute right-[-4%] bottom-2 rotate-[-4deg] bg-lime px-7 py-4 shadow-[0_10px_24px_-8px_rgba(22,21,15,0.35)] sm:right-[-8%]"
    >
      <p className="font-hand text-2xl leading-none font-bold text-lime-ink">
        Felipe paid $36.70
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.22em] text-lime-ink/70 uppercase">
        <Check className="size-3" strokeWidth={3} aria-hidden />
        Confirmed on-chain
      </p>
    </div>
  )
}

/** A rubber stamp on the dark half, for the corner that would otherwise be empty. */
function Stamp () {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      className="absolute bottom-4 left-[-24%] hidden size-32 -rotate-12 text-paper/35 xl:block"
    >
      <defs>
        <path id="stamp-arc" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" fill="none" />
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="1" />
      <text className="text-[11px] font-bold tracking-[0.24em] uppercase" fill="currentColor">
        <textPath href="#stamp-arc" startOffset="50%" textAnchor="middle">
          Real money · Real friends ·
        </textPath>
      </text>
      <path
        d="M48 60l8 8 16-18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
