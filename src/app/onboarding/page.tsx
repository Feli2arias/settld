'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client/api'
import { saveSeed, saveSession } from '@/lib/client/vault'
import { deriveAddress, generateSeedPhrase } from '@/lib/wdk/wallet'

type Step = 'form' | 'creating'

/**
 * Crear cuenta = crear wallet. Para el usuario es un solo paso: pone su nombre y
 * listo. Debajo, WDK genera una seed en este dispositivo y deriva la address.
 * En ningún momento le mostramos una seed phrase ni le pedimos que entienda qué es.
 */
export default function OnboardingPage () {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length >= 2 && username.trim().length >= 3

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return

    setStep('creating')
    setError(null)

    try {
      const seedPhrase = await generateSeedPhrase()
      const walletAddress = await deriveAddress(seedPhrase)

      const user = await api.createUser({ name, username, walletAddress })

      // La seed primero: si algo falla después, el usuario no queda con una cuenta
      // en el servidor cuya wallet ya no puede abrir.
      saveSeed(seedPhrase)
      saveSession({
        userId: user.id,
        username: user.username,
        name: user.name,
        walletAddress: user.walletAddress
      })

      router.replace('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta')
      setStep('form')
    }
  }

  if (step === 'creating') {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Loader2 className="size-8 animate-spin text-credit" aria-hidden />
          <div>
            <p className="font-heading text-2xl font-bold">Creando tu cuenta</p>
            <p className="mt-2 text-sm text-muted-foreground">Preparando tu wallet…</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Crear cuenta" backHref="/">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-7 pt-6">
          <div className="space-y-2.5">
            <Label htmlFor="name" className="eyebrow">Tu nombre</Label>
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
            <Label htmlFor="username" className="eyebrow">Usuario</Label>
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
              Así te van a encontrar tus amigos para sumarte a un grupo.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" size="pill-lg" disabled={!canSubmit} className="mt-8">
          Crear cuenta
        </Button>
      </form>
    </AppShell>
  )
}
