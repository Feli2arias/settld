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
// Variants: the recovery phrase starts hidden and is revealed on demand
// States: default | phrase hidden | phrase visible | copied (2s) | signing out
// Accessibility: a Radix Dialog — focus trapped, closes on Escape, title and description
//   announced. The copy buttons confirm with text, not colour alone.
// Responsive: content adapts to the dialog width; the phrase uses a 3-column grid on
//   mobile and 4 from sm up

/**
 * The user's account, and the only place the recovery phrase ever appears.
 *
 * Settld hides the infrastructure by design, but hiding the phrase entirely would be
 * lying to people: without it, clearing the browser means losing the money forever. So
 * we don't shove it in their face at signup, but it lives here, one tap away, and it's
 * what makes signing back in from another device possible.
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
      // Without clipboard permission there's nothing to do: the phrase is on screen
      // to be copied by hand.
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
            Your account, your recovery phrase and the option to sign out.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="eyebrow mb-2">Your wallet</p>
            <button
              type="button"
              onClick={() => copy(session.walletAddress, 'address')}
              className="flex w-full items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-left font-mono text-xs transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="min-w-0 flex-1 truncate">{session.walletAddress}</span>
              {copied === 'address'
                ? <span className="shrink-0 font-sans text-xs font-bold text-credit">copied</span>
                : <Copy className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
            </button>
          </div>

          <div>
            <p className="eyebrow mb-2">Recovery phrase</p>

            {!revealed
              ? (
                  <div className="rounded-2xl bg-secondary px-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      These 12 words are your account. Save them so you can sign in from
                      another device — anyone who has them can move your money.
                    </p>
                    <Button
                      size="pill"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setRevealed(true)}
                    >
                      <Eye aria-hidden />
                      Show
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
                        {copied === 'phrase' ? 'Copied' : 'Copy phrase'}
                      </Button>
                    </div>
                  )
                : (
                    <p className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
                      We couldn't find your phrase on this device.
                    </p>
                  )}
          </div>

          <Button size="pill" variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut aria-hidden />
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
