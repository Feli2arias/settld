'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/client/api'
import { useRequireSession } from '@/lib/client/use-session'
import type { User } from '@/lib/split/types'

export default function NewGroupPage () {
  const session = useRequireSession()
  const router = useRouter()

  const [name, setName] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [members, setMembers] = useState<User[]>([])
  const [looking, setLooking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAddMember (event: React.FormEvent) {
    event.preventDefault()

    const username = usernameInput.trim().replace(/^@/, '').toLowerCase()
    if (!username || !session) return

    if (username === session.username) {
      setError('Ya estás en el grupo')
      return
    }
    if (members.some(member => member.username === username)) {
      setError(`@${username} ya está en la lista`)
      return
    }

    setLooking(true)
    setError(null)

    try {
      const user = await api.lookupUser(username)
      if (!user) {
        setError(`No encontramos a @${username}`)
        return
      }
      setMembers(current => [...current, user])
      setUsernameInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos buscar ese usuario')
    } finally {
      setLooking(false)
    }
  }

  const removeMember = (id: string) => setMembers(current => current.filter(m => m.id !== id))

  async function handleCreate () {
    if (!session || !name.trim()) return

    setCreating(true)
    setError(null)

    try {
      const group = await api.createGroup({
        name,
        memberIds: [session.userId, ...members.map(m => m.id)]
      })
      router.replace(`/groups/${group.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear el grupo')
      setCreating(false)
    }
  }

  if (!session) return null

  return (
    <AppShell title="Nuevo grupo" backHref="/home" className="gap-7">
      <div className="space-y-2.5 pt-4">
        <Label htmlFor="group-name" className="eyebrow">Nombre del grupo</Label>
        <Input
          id="group-name"
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder="Aleph Hackathon"
          autoFocus
          className="h-14 rounded-2xl px-5 text-lg"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="member" className="eyebrow">Sumar gente</Label>

        <form onSubmit={handleAddMember} className="flex gap-2">
          <div className="relative flex-1">
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
            >
              @
            </span>
            <Input
              id="member"
              value={usernameInput}
              onChange={event => setUsernameInput(event.target.value.replace(/[^a-zA-Z0-9_@]/g, '').toLowerCase())}
              placeholder="felipe"
              autoCapitalize="none"
              spellCheck={false}
              className="h-12 rounded-2xl pr-4 pl-9"
            />
          </div>
          <Button type="submit" size="pill" variant="secondary" disabled={looking || !usernameInput.trim()}>
            {looking ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Sumar
          </Button>
        </form>

        <ul className="space-y-2">
          <li className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3">
            <PersonAvatar user={session} size="sm" />
            <span className="flex-1 text-sm font-bold">{session.name}</span>
            <span className="text-xs font-semibold text-muted-foreground">vos</span>
          </li>

          {members.map(member => (
            <li key={member.id} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-border">
              <PersonAvatar user={member} size="sm" />
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-bold">{member.name}</span>
                <span className="block text-xs text-muted-foreground">@{member.username}</span>
              </span>
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                aria-label={`Sacar a ${member.name} del grupo`}
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="rounded-2xl bg-debit-surface px-4 py-3 text-sm font-semibold text-debit">
            {error}
          </p>
        )}
      </div>

      <div className="mt-auto pt-8">
        <Button size="pill-lg" onClick={handleCreate} disabled={!name.trim() || creating}>
          {creating && <Loader2 className="animate-spin" aria-hidden />}
          Crear grupo
        </Button>
      </div>
    </AppShell>
  )
}
