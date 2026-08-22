import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { Amount } from '@/components/amount'
import { Chip, Panel, PanelHead } from '@/components/dashboard/panel'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { formatWhen } from '@/lib/split/dashboard'
import type { Settld, User } from '@/lib/split/types'

// Contract: SettldList
// Props: settlds, people, userId, limit?, title?, emptyTitle?, emptyLine?
// Variants: empty state with its own call to action
// States: each row links to the settld — hover and visible focus
// Accessibility: a <ul> of links under a heading. "You paid" is text, not a colour.
// Responsive: the date drops below sm, where the row gets tight

/** Your settlds, newest first. The row says what it was, how much, and who put it down. */
export function SettldList ({
  settlds,
  people,
  userId,
  limit,
  title = 'Your settlds',
  emptyTitle = 'Nothing split yet',
  emptyLine = 'Put in what you paid for and who was there. Settld works out the rest.'
}: {
  settlds: Settld[]
  people: User[]
  userId: string
  limit?: number
  title?: string
  emptyTitle?: string
  emptyLine?: string
}) {
  const shown = limit ? settlds.slice(0, limit) : settlds
  const payer = (id: string) => people.find(person => person.id === id)

  return (
    <Panel>
      <PanelHead
        title={title}
        id="settlds-label"
        action={
          limit && settlds.length > limit
            ? (
                <Link
                  href="/settlds"
                  className="shrink-0 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  See all {settlds.length}
                </Link>
              )
            : (
                <Link
                  href="/settlds/new"
                  className="flex shrink-0 items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Plus className="size-3.5" aria-hidden />
                  New settld
                </Link>
              )
        }
      />

      {shown.length === 0
        ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-9 text-center">
              <p className="font-heading text-base font-bold">{emptyTitle}</p>
              <p className="mt-1.5 mb-5 text-sm text-muted-foreground">{emptyLine}</p>
              <Button size="pill" asChild>
                <Link href="/settlds/new">
                  <Plus aria-hidden />
                  New settld
                </Link>
              </Button>
            </div>
          )
        : (
            <ul className="-mx-2 divide-y divide-border">
              {shown.map(settld => {
                const person = payer(settld.paidBy)
                const yours = settld.paidBy === userId

                return (
                  <li key={settld.id}>
                    <Link
                      href={`/settlds/${settld.id}`}
                      className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {person && <PersonAvatar user={person} size="md" />}

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-base font-bold">
                          {settld.description}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                          {settld.splitBetween.length} people
                          <span className="hidden sm:inline"> · {formatWhen(settld.createdAt)}</span>
                        </span>
                      </span>

                      {yours && <Chip tone="credit">You paid</Chip>}

                      <Amount cents={settld.amountCents} size="sm" className="shrink-0" />

                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
    </Panel>
  )
}
