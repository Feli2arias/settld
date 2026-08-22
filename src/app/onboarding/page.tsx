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

type Step = 'form' | 'creating'

/** Corta pero no ridícula: el vault se rompe a fuerza bruta si la contraseña es floja. */
const MIN_PASSWORD = 8

/**
 * Crear cuenta = crear wallet. Para el usuario es un solo paso: pone su nombre y
 * listo. Debajo, WDK genera una seed en este dispositivo y deriva la address.
 *
 * Acá no le mostramos la frase de recuperación ni le pedimos que entienda qué es:
 * eso arruinaría el momento de entrada. Pero está disponible a un toque desde la
 * pantalla de inicio, y es lo que le permite volver a entrar desde otro dispositivo.
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

      // Ciframos la wallet con la contraseña acá, en el dispositivo. Al servidor le
      // llega el bulto cerrado; la contraseña no sale nunca de esta pantalla.
      const vault = await encryptSeed(seedPhrase, password)

      const user = await api.createUser({ name, username, walletAddress, vault })

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

          <div className="space-y-2.5">
            <Label htmlFor="password" className="eyebrow">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              aria-describedby="password-hint"
              className="h-14 rounded-2xl px-5 text-lg"
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              Con esto entrás desde cualquier dispositivo. No la guardamos en ningún
              lado, así que si la perdés vas a necesitar tu frase de recuperación.
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
            Crear cuenta
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link
              href="/login"
              className="font-bold text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Entrá
            </Link>
          </p>
        </div>
      </form>
    </AppShell>
  )
}
