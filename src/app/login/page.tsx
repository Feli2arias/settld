'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client/api'
import { saveSeed, saveSession } from '@/lib/client/vault'
import { deriveAddress, normalizeSeedPhrase } from '@/lib/wdk/wallet'

/**
 * Volver a entrar a una cuenta.
 *
 * Como la cuenta ES la wallet, la credencial es la frase de recuperación. El navegador
 * deriva la address de la frase y le pregunta al servidor de quién es; la frase nunca
 * sale del dispositivo, ni siquiera acá.
 */
export default function LoginPage () {
  const router = useRouter()
  const [phrase, setPhrase] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wordCount = phrase.trim() ? phrase.trim().split(/\s+/).length : 0

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()

    const seedPhrase = normalizeSeedPhrase(phrase)
    if (!seedPhrase) {
      setError('Una frase de recuperación tiene 12 palabras separadas por espacios')
      return
    }

    setChecking(true)
    setError(null)

    try {
      const walletAddress = await deriveAddress(seedPhrase)
      const user = await api.lookupUserByAddress(walletAddress)

      if (!user) {
        setError('Esa frase es válida, pero no hay ninguna cuenta de Split asociada')
        return
      }

      saveSeed(seedPhrase)
      saveSession({
        userId: user.id,
        username: user.username,
        name: user.name,
        walletAddress: user.walletAddress
      })

      router.replace('/home')
    } catch {
      setError('No pudimos leer esa frase. Fijate que las palabras estén bien escritas.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <AppShell title="Entrar" backHref="/">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
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
              ? 'La encontrás en Split, en la pantalla de inicio, tocando tu nombre.'
              : `${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'}`}
          </p>

          {error && (
            <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
              {error}
            </p>
          )}
        </div>

        <div className="mt-auto space-y-4 pt-8">
          <Button type="submit" size="pill-lg" disabled={checking || wordCount === 0}>
            {checking && <Loader2 className="animate-spin" aria-hidden />}
            Entrar
          </Button>

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
    </AppShell>
  )
}
