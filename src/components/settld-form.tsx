'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client/api'
import { splitEqually } from '@/lib/split/balances'
import { formatMoney, parseMoney } from '@/lib/wdk/money'
import type { User } from '@/lib/split/types'

// Contract: SettldForm
// Props: session, initial? (editing an existing one), submitLabel, onSubmit, onDelete?
// Variants: creating (no initial) | editing (initial, and a delete button)
// States: idle | looking somebody up | saving | error | deleting
// Accessibility: real <label> per field, the running split announced as text, errors in a
//   role="alert" region. Adding somebody is a form of its own so Enter does one thing.
// Responsive: single column at every width; the amount stays the biggest thing on screen

export interface SettldDraft {
  description: string
  amountCents: number
  splitBetween: string[]
}

/**
 * The one form in Settld that creates a debt.
 *
 * It asks for three things — what it was, how much, who was there — and shows the split
 * as it changes, because the number each person ends up owing is the whole point and
 * finding it out after saving is too late.
 *
 * Whoever fills it in is the one who paid. That is not a field: you are recording money
 * that already left your pocket.
 */
export function SettldForm ({
  session,
  people,
  initial,
  submitLabel,
  onSubmit,
  onDelete
}: {
  session: User
  people: User[]
  initial?: SettldDraft
  submitLabel: string
  onSubmit: (draft: SettldDraft) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? (initial.amountCents / 100).toFixed(2) : '')
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [members, setMembers] = useState<User[]>(() => {
    if (!initial) return [session]

    return initial.splitBetween.map(id =>
      people.find(person => person.id === id) ?? { id, name: 'Someone', username: 'unknown', walletAddress: '' }
    )
  })

  const amountCents = parseMoney(amount)
  const shares = amountCents && members.length > 0 ? splitEqually(amountCents, members.length) : []
  const ready = Boolean(description.trim() && amountCents && amountCents > 0 && members.length >= 2)

  async function addPerson (event: React.FormEvent) {
    event.preventDefault()

    const username = handle.trim().replace(/^@/, '').toLowerCase()
    if (!username) return

    if (members.some(member => member.username === username)) {
      setError('They are already in')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const found = await api.lookupUser(username)
      if (!found) {
        setError(`We couldn't find @${username}`)
        return
      }

      setMembers(current => [...current, found])
      setHandle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't look them up")
    } finally {
      setBusy(false)
    }
  }

  async function save () {
    if (!ready || !amountCents) return

    setBusy(true)
    setError(null)

    try {
      await onSubmit({
        description: description.trim(),
        amountCents,
        splitBetween: members.map(member => member.id)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save it")
      setBusy(false)
    }
  }

  async function remove () {
    if (!onDelete) return

    setBusy(true)
    setError(null)

    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't delete it")
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-7">
      <div>
        <Label htmlFor="description" className="eyebrow mb-2 block">What was it</Label>
        <Input
          id="description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Dinner at Sikwa"
          maxLength={80}
          autoComplete="off"
        />
      </div>

      <div>
        <Label htmlFor="amount" className="eyebrow mb-2 block">How much you paid</Label>
        <div className="flex items-baseline gap-2">
          <span className="amount text-4xl text-muted-foreground">$</span>
          <input
            id="amount"
            value={amount}
            onChange={event => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="amount w-full min-w-0 bg-transparent text-5xl outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      <div>
        <p className="eyebrow mb-2">Split between</p>

        <ul className="mb-3 space-y-2">
          {members.map(member => {
            const index = members.indexOf(member)
            const isYou = member.id === session.id

            return (
              <li key={member.id} className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2.5">
                <PersonAvatar user={member} size="sm" />

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {member.name}
                    {isYou && <span className="font-normal text-muted-foreground"> (you)</span>}
                  </span>
                </span>

                {shares[index] !== undefined && (
                  <span className="shrink-0 text-sm font-bold tabular-nums text-muted-foreground">
                    {formatMoney(shares[index])}
                  </span>
                )}

                {!isYou && (
                  <button
                    type="button"
                    onClick={() => setMembers(current => current.filter(c => c.id !== member.id))}
                    aria-label={`Take ${member.name} out`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <form onSubmit={addPerson} className="flex gap-2">
          <Input
            value={handle}
            onChange={event => setHandle(event.target.value)}
            placeholder="@username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-label="Add somebody by username"
          />
          <Button type="submit" size="pill" variant="secondary" disabled={busy || !handle.trim()}>
            <Plus aria-hidden />
            Add
          </Button>
        </form>

        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          {members.length < 2
            ? 'Add at least one other person.'
            : amountCents
              ? `${formatMoney(shares[0])} each, and they owe you their share.`
              : 'Everyone pays an equal share.'}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button size="pill-lg" onClick={save} disabled={!ready || busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {submitLabel}
        </Button>

        {onDelete && (
          <Button size="pill" variant="ghost" onClick={remove} disabled={busy} className="text-debit">
            Delete this settld
          </Button>
        )}
      </div>
    </div>
  )
}
