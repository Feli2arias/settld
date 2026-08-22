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
import { encryptSeed } from '@/lib/client/vault-crypto'
import { deriveAddress, generateSeedPhrase } from '@/lib/wdk/wallet'
import { describeWalletError } from '@/lib/wdk/errors'

type Step = 'form' | 'creating'

/** Short but not laughable: a weak password makes the vault brute-forceable. */
const MIN_PASSWORD = 8

/**
 * Creating an account means creating a wallet. To the user it's a single step: they
 * type their name and that's it. Underneath, WDK generates a seed on this device and
 * derives the address.
 *
 * We don't show them the recovery phrase here, and we don't ask them to understand
 * what it is: that would ruin the moment of walking in. It's one tap away from the
 * home screen, which is what lets them sign back in from another device.
 */
export default function OnboardingPage () {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    name.trim().length >= 2 && username.trim().length >= 3 && password.length >= MIN_PASSWORD

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setStep('creating')
    setError(null)

    try {
      const seedPhrase = await generateSeedPhrase()
      const walletAddress = await deriveAddress(seedPhrase)

      // We encrypt the wallet with the password right here, on the device. The server
      // only ever receives the sealed bundle; the password never leaves this screen.
      const vault = await encryptSeed(seedPhrase, password)

      const user = await api.createUser({ name, username, walletAddress, vault })

      // Seed first: if anything fails after this, the user isn't left with an account
      // on the server whose wallet they can no longer open.
      saveSeed(seedPhrase)
      saveSession({
        userId: user.id,
        username: user.username,
        name: user.name,
        walletAddress: user.walletAddress
      })

      router.replace('/home')
    } catch (err) {
      setError(describeWalletError(err, "We couldn't create your account"))
      setStep('form')
    }
  }

  if (step === 'creating') {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Loader2 className="size-8 animate-spin text-credit" aria-hidden />
          <div>
            <p className="font-heading text-2xl font-bold">Creating your account</p>
            <p className="mt-2 text-sm text-muted-foreground">Setting up your wallet…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Create account" backHref="/">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-7 pt-6">
          <div className="space-y-2.5">
            <Label htmlFor="name" className="eyebrow">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Daniel"
              autoComplete="given-name"
              autoFocus
              className="h-14 rounded-2xl px-5 text-lg"
            />
          </div>

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
                onChange={event => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                placeholder="daniel"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="username-hint"
                className="h-14 rounded-2xl pr-5 pl-10 text-lg"
              />
            </div>
            <p id="username-hint" className="text-xs text-muted-foreground">
              This is how your friends will find you to add you to a group.
            </p>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password" className="eyebrow">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-describedby="password-hint"
              className="h-14 rounded-2xl px-5 text-lg"
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              This is how you sign in from any device. We never store it anywhere, so if
              you lose it you&rsquo;ll need your recovery phrase.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
              {error}
            </p>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <Button type="submit" size="pill-lg" disabled={!canSubmit}>
            Create account
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </AppShell>
  )
}
