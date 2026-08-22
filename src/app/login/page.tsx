'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client/api'
import { saveSeed, saveSession } from '@/lib/client/vault'
import { WrongPasswordError, decryptSeed } from '@/lib/client/vault-crypto'
import { deriveAddress, normalizeSeedPhrase } from '@/lib/wdk/wallet'
import type { User } from '@/lib/split/types'
import { describeWalletError } from '@/lib/wdk/errors'

type Mode = 'password' | 'phrase'

/**
 * Signing back into an account, by two routes.
 *
 * The everyday one is username and password: the browser downloads the encrypted
 * wallet and opens it right here. The password never travels anywhere and the server
 * can never open the bundle, so the account feels normal without ceasing to be theirs.
 *
 * The emergency one is the recovery phrase, for when the password is forgotten or the
 * account is old enough that it doesn't have one.
 */
export default function LoginPage () {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Saves the session and goes in. It's the shared ending of both routes. */
  function enter (user: User, seedPhrase: string) {
    saveSeed(seedPhrase)
    saveSession({
      userId: user.id,
      username: user.username,
      name: user.name,
      walletAddress: user.walletAddress
    })
    router.replace('/home')
  }

  async function loginWithPassword (event: React.FormEvent) {
    event.preventDefault()

    const handle = username.trim().replace(/^@/, '').toLowerCase()
    if (!handle || !password) return

    setBusy(true)
    setError(null)

    try {
      const [user, vault] = await Promise.all([api.lookupUser(handle), api.getVault(handle)])

      if (!user) {
        setError(`We couldn't find the account @${handle}`)
        return
      }
      if (!vault) {
        setError('This account was created before passwords existed. Sign in with your recovery phrase.')
        return
      }

      enter(user, await decryptSeed(vault, password))
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Wrong password'
          : describeWalletError(err, "We couldn't sign you in")
      )
    } finally {
      setBusy(false)
    }
  }

  async function loginWithPhrase (event: React.FormEvent) {
    event.preventDefault()

    const seedPhrase = normalizeSeedPhrase(phrase)
    if (!seedPhrase) {
      setError('A recovery phrase is 12 words separated by spaces')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const user = await api.lookupUserByAddress(await deriveAddress(seedPhrase))

      if (!user) {
        setError("That phrase is valid, but there's no Settld account linked to it")
        return
      }

      enter(user, seedPhrase)
    } catch {
      setError("We couldn't read that phrase. Check that the words are spelled correctly.")
    } finally {
      setBusy(false)
    }
  }

  function switchTo (next: Mode) {
    setMode(next)
    setError(null)
  }

  const wordCount = phrase.trim() ? phrase.trim().split(/\s+/).length : 0

  return (
    <AppShell title="Sign in" backHref="/">
      {mode === 'password'
        ? (
            <form onSubmit={loginWithPassword} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-6 pt-6">
                <div className="space-y-2.5">
                  <Label htmlFor="username" className="eyebrow">Username</Label>
                  <div className="relative">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-lg text-muted-foreground"
                    >
                      @
                    </span>
                    <Input
                      id="username"
                      value={username}
                      onChange={event => setUsername(event.target.value.replace(/[^a-zA-Z0-9_@]/g, '').toLowerCase())}
                      placeholder="daniel"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      autoFocus
                      className="h-14 rounded-2xl pr-5 pl-10 text-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="eyebrow">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="h-14 rounded-2xl px-5 text-lg"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-auto space-y-4 pt-8">
                <Button type="submit" size="pill-lg" disabled={busy || !username.trim() || !password}>
                  {busy && <Loader2 className="animate-spin" aria-hidden />}
                  {busy ? 'Opening your account…' : 'Sign in'}
                </Button>

                <button
                  type="button"
                  onClick={() => switchTo('phrase')}
                  className="w-full text-center text-sm font-bold text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  I forgot my password
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  Don&rsquo;t have an account?{' '}
                  <Link
                    href="/onboarding"
                    className="font-bold text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </form>
          )
        : (
            <form onSubmit={loginWithPhrase} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-3 pt-6">
                <Label htmlFor="phrase" className="eyebrow">Your recovery phrase</Label>

                <textarea
                  id="phrase"
                  value={phrase}
                  onChange={event => setPhrase(event.target.value)}
                  placeholder="the twelve words you saved, separated by spaces"
                  rows={4}
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="phrase-hint"
                  className="w-full resize-none rounded-2xl border border-input bg-card px-5 py-4 text-base leading-relaxed outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />

                <p id="phrase-hint" className="text-xs text-muted-foreground">
                  {wordCount === 0
                    ? 'You can find it in Settld, on the home screen, by tapping your name.'
                    : `${wordCount} ${wordCount === 1 ? 'word' : 'words'}`}
                </p>

                {error && (
                  <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
                    {error}
                  </p>
                )}
              </div>

              <div className="mt-auto space-y-4 pt-8">
                <Button type="submit" size="pill-lg" disabled={busy || wordCount === 0}>
                  {busy && <Loader2 className="animate-spin" aria-hidden />}
                  Sign in
                </Button>

                <button
                  type="button"
                  onClick={() => switchTo('password')}
                  className="w-full text-center text-sm font-bold text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Sign in with username and password
                </button>
              </div>
            </form>
          )}
    </AppShell>
  )
}
