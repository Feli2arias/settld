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

type Mode = 'password' | 'phrase'

/**
 * Volver a entrar a una cuenta, por dos caminos.
 *
 * El de todos los días es usuario y contraseña: el navegador se baja la wallet cifrada
 * y la abre acá mismo. La contraseña no viaja a ningún lado y el servidor nunca puede
 * abrir el bulto, así que la cuenta se siente normal sin dejar de ser del usuario.
 *
 * El de emergencia es la frase de recuperación, para cuando la contraseña se olvidó
 * o la cuenta es vieja y no tiene una.
 */
export default function LoginPage () {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phrase, setPhrase] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Guarda la sesión y entra. Es el final común de los dos caminos. */
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
        setError(`No encontramos la cuenta @${handle}`)
        return
      }
      if (!vault) {
        setError('Esta cuenta se creó antes de que hubiera contraseñas. Entrá con tu frase de recuperación.')
        return
      }

      enter(user, await decryptSeed(vault, password))
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'Contraseña incorrecta'
          : err instanceof Error ? err.message : 'No pudimos entrar'
      )
    } finally {
      setBusy(false)
    }
  }

  async function loginWithPhrase (event: React.FormEvent) {
    event.preventDefault()

    const seedPhrase = normalizeSeedPhrase(phrase)
    if (!seedPhrase) {
      setError('Una frase de recuperación tiene 12 palabras separadas por espacios')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const user = await api.lookupUserByAddress(await deriveAddress(seedPhrase))

      if (!user) {
        setError('Esa frase es válida, pero no hay ninguna cuenta de Settld asociada')
        return
      }

      enter(user, seedPhrase)
    } catch {
      setError('No pudimos leer esa frase. Fijate que las palabras estén bien escritas.')
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
    <AppShell title="Entrar" backHref="/">
      {mode === 'password'
        ? (
            <form onSubmit={loginWithPassword} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-6 pt-6">
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
                  <Label htmlFor="password" className="eyebrow">Contraseña</Label>
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
                  {busy ? 'Abriendo tu cuenta…' : 'Entrar'}
                </Button>

                <button
                  type="button"
                  onClick={() => switchTo('phrase')}
                  className="w-full text-center text-sm font-bold text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Olvidé mi contraseña
                </button>

                <p className="text-center text-sm text-muted-foreground">
                  ¿No tenés cuenta?{' '}
                  <Link
                    href="/onboarding"
                    className="font-bold text-foreground underline underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    Creá una
                  </Link>
                </p>
              </div>
            </form>
          )
        : (
            <form onSubmit={loginWithPhrase} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-3 pt-6">
                <Label htmlFor="phrase" className="eyebrow">Tu frase de recuperación</Label>

                <textarea
                  id="phrase"
                  value={phrase}
                  onChange={event => setPhrase(event.target.value)}
                  placeholder="las doce palabras que guardaste, separadas por espacios"
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
                    ? 'La encontrás en Settld, en la pantalla de inicio, tocando tu nombre.'
                    : `${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'}`}
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
                  Entrar
                </Button>

                <button
                  type="button"
                  onClick={() => switchTo('password')}
                  className="w-full text-center text-sm font-bold text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Entrar con usuario y contraseña
                </button>
              </div>
            </form>
          )}
    </AppShell>
  )
}
