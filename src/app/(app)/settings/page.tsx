'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, Check, Copy, Eye, LogOut } from 'lucide-react'
import { AddMoneyDialog } from '@/components/add-money-dialog'
import { AppShell } from '@/components/app-shell'
import { Panel } from '@/components/dashboard/panel'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { useRequireSession } from '@/lib/client/use-session'
import { forgetEverything, readSeed } from '@/lib/client/vault'

/**
 * Your account, and the only place the recovery phrase ever appears.
 *
 * Settld hides the infrastructure by design, but hiding the phrase entirely would be lying
 * to people: without it, clearing the browser means losing the money forever. So we don't
 * shove it in anyone's face at signup, but it lives here, one tap away, and it is what
 * makes signing back in from another device possible.
 *
 * This used to be a dialog. It became a screen because a dialog can't be linked to, can't
 * be a destination in the navigation, and buries the one thing somebody may need to find
 * in a hurry.
 */
export default function SettingsPage () {
  const session = useRequireSession()
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
      // Without clipboard permission there's nothing to do: the value is on screen
      // to be copied by hand.
    }
  }

  function signOut () {
    forgetEverything()
    router.replace('/')
  }

  if (!session) return null

  return (
    <AppShell title="Settings" width="wide" className="max-w-2xl gap-4">
      <Panel>
        <div className="flex items-center gap-4">
          <PersonAvatar user={session} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-heading text-xl font-extrabold">{session.name}</p>
            <p className="truncate text-sm font-semibold text-muted-foreground">@{session.username}</p>
          </div>
        </div>
      </Panel>

      <Panel>
        <p className="eyebrow mb-1.5">Your account</p>
        <p className="mb-3 text-sm text-muted-foreground">
          Share this and anyone can send you money straight into your balance.
        </p>

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

        <AddMoneyDialog address={session.walletAddress}>
          <Button size="pill" variant="secondary" className="mt-4">
            <ArrowDownLeft aria-hidden />
            Add money
          </Button>
        </AddMoneyDialog>
      </Panel>

      <Panel>
        <p className="eyebrow mb-1.5">Recovery phrase</p>

        {!revealed
          ? (
              <>
                <p className="text-sm text-muted-foreground">
                  These 12 words are your account. Save them so you can sign in from another
                  device — anyone who has them can move your money.
                </p>
                <Button size="pill" variant="outline" className="mt-4" onClick={() => setRevealed(true)}>
                  <Eye aria-hidden />
                  Show
                </Button>
              </>
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
                        <span className="text-[0.625rem] tabular-nums text-muted-foreground">
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
                  We couldn&rsquo;t find your phrase on this device.
                </p>
              )}
      </Panel>

      <Panel>
        <p className="eyebrow mb-1.5">Sign out</p>
        <p className="text-sm text-muted-foreground">
          Your account stays where it is. To come back you need your username and password,
          or the 12 words above.
        </p>
        <Button size="pill" variant="ghost" className="mt-4" onClick={signOut}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </Panel>
    </AppShell>
  )
}
