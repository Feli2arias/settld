'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client/api'
import { memberOf, useGroup } from '@/lib/client/use-group'
import { useRequireSession } from '@/lib/client/use-session'
import { splitEqually } from '@/lib/split/balances'
import { formatMoney, parseMoney } from '@/lib/wdk/money'
import { cn } from '@/lib/utils'

export default function NewExpensePage ({ params }: PageProps<'/groups/[id]/expenses/new'>) {
  const { id } = use(params)
  const session = useRequireSession()
  const router = useRouter()
  const { detail } = useGroup(id)

  const [description, setDescription] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [paidBy, setPaidBy] = useState<string | null>(null)
  const [splitBetween, setSplitBetween] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Por defecto: lo pagó quien está usando la app, y se divide entre todos.
  useEffect(() => {
    if (!detail || !session || paidBy) return
    setPaidBy(session.userId)
    setSplitBetween(detail.members.map(m => m.id))
  }, [detail, session, paidBy])

  if (!session || !detail) {
    return (
      <AppShell title="Nuevo gasto" backHref={`/groups/${id}`}>
        <p className="pt-8 text-sm text-muted-foreground">Cargando…</p>
      </AppShell>
    )
  }

  const amountCents = parseMoney(amountInput)
  const shares = amountCents && splitBetween.length > 0
    ? splitEqually(amountCents, splitBetween.length)
    : []

  const canSubmit =
    description.trim().length > 0 &&
    amountCents !== null &&
    amountCents > 0 &&
    paidBy !== null &&
    splitBetween.length > 0

  const toggleMember = (userId: string) =>
    setSplitBetween(current =>
      current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]
    )

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit || !amountCents || !paidBy) return

    setSaving(true)
    setError(null)

    try {
      await api.createExpense({ groupId: id, description, amountCents, paidBy, splitBetween })
      router.replace(`/groups/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar el gasto')
      setSaving(false)
    }
  }

  return (
    <AppShell title="Nuevo gasto" backHref={`/groups/${id}`}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-7 pt-4">
        <div className="space-y-2.5">
          <Label htmlFor="description" className="eyebrow">¿Qué fue?</Label>
          <Input
            id="description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Cena"
            autoFocus
            className="h-14 rounded-2xl px-5 text-lg"
          />
        </div>

        <div className="space-y-2.5">
          <Label htmlFor="amount" className="eyebrow">Monto</Label>
          <div className="relative">
            <span
              aria-hidden
              className="amount pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-2xl text-muted-foreground"
            >
              $
            </span>
            <Input
              id="amount"
              value={amountInput}
              onChange={event => setAmountInput(event.target.value)}
              placeholder="120"
              inputMode="decimal"
              className="amount h-20 rounded-2xl pr-5 pl-11 !text-4xl"
            />
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="eyebrow mb-3">Quién pagó</legend>
          <div className="flex flex-wrap gap-2">
            {detail.members.map(member => {
              const selected = paidBy === member.id
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setPaidBy(member.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex items-center gap-2 rounded-full py-2 pr-4 pl-2 text-sm font-bold transition-all motion-safe:active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  )}
                >
                  <PersonAvatar user={member} size="sm" />
                  {member.id === session.userId ? 'Vos' : member.name}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="eyebrow mb-3">Entre quiénes se divide</legend>
          <ul className="space-y-2">
            {detail.members.map(member => {
              const index = splitBetween.indexOf(member.id)
              const selected = index !== -1

              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    aria-pressed={selected}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                      selected ? 'bg-card ring-1 ring-ring/40' : 'bg-secondary/60 opacity-60'
                    )}
                  >
                    <PersonAvatar user={member} size="sm" />
                    <span className="flex-1 truncate text-sm font-bold">
                      {member.id === session.userId ? 'Vos' : member.name}
                    </span>

                    {selected && shares[index] !== undefined && (
                      <span className="text-sm font-bold tabular-nums">{formatMoney(shares[index])}</span>
                    )}

                    <span
                      aria-hidden
                      className={cn(
                        'flex size-5 items-center justify-center rounded-full border-2 transition-colors',
                        selected ? 'border-credit bg-credit text-background' : 'border-border'
                      )}
                    >
                      {selected && <Check className="size-3" strokeWidth={3.5} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {shares.length > 0 && (
            <p className="pt-1 text-sm font-semibold text-muted-foreground">
              {formatMoney(shares[0])} cada uno
            </p>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
            {error}
          </p>
        )}

        <div className="mt-auto pt-8">
          <Button type="submit" size="pill-lg" disabled={!canSubmit || saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden />}
            Agregar gasto
          </Button>
        </div>
      </form>
    </AppShell>
  )
}
