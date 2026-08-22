import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { Amount } from '@/components/amount'
import { Chip, Panel, PanelHead } from '@/components/dashboard/panel'
import { Button } from '@/components/ui/button'
import { initials, tintFor } from '@/components/person'
import { cn } from '@/lib/utils'
import type { GroupCard } from '@/lib/split/dashboard'

// Contract: OpenGroups
// Props: groups (required, may be empty)
// Variants: empty state when there are no groups yet
// States: each row has hover, visible focus and an active/settled tone
// Accessibility: a <ul> of links inside a section labelled by its heading. The status is
//   written in words in the chip, never carried by colour alone.
// Responsive: the "owed to you" caption is dropped below sm, where the row gets tight

/** No group has a photo, so it gets a tinted square with its initials instead. */
function GroupBadge ({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold',
        tintFor(name)
      )}
    >
      {initials(name)}
    </span>
  )
}

function statusOf (card: GroupCard) {
  if (card.netCents < 0) return { tone: 'debit' as const, label: 'You owe' }
  if (card.unpaidCount > 0) return { tone: 'debit' as const, label: `${card.unpaidCount} unpaid` }
  return { tone: 'credit' as const, label: 'All settled' }
}

export function OpenGroups ({ groups }: { groups: GroupCard[] }) {
  if (groups.length === 0) {
    return (
      <Panel>
        <PanelHead title="Your groups" id="groups-label" />
        <div className="rounded-2xl border border-dashed border-border px-6 py-9 text-center">
          <p className="font-heading text-base font-bold">No groups yet</p>
          <p className="mt-1.5 mb-5 text-sm text-muted-foreground">
            Create one to start splitting expenses.
          </p>
          <Button size="pill" asChild>
            <Link href="/groups/new">
              <Plus aria-hidden />
              New group
            </Link>
          </Button>
        </div>
      </Panel>
    )
  }

  return (
    <Panel>
      <PanelHead
        title="Open groups"
        id="groups-label"
        action={
          <Link
            href="/groups/new"
            className="flex shrink-0 items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Plus className="size-3.5" aria-hidden />
            New group
          </Link>
        }
      />

      <ul className="-mx-2 divide-y divide-border">
        {groups.map(card => {
          const status = statusOf(card)

          return (
            <li key={card.group.id}>
              <Link
                href={`/groups/${card.group.id}`}
                className="flex items-center gap-2.5 rounded-2xl px-2 py-3 transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <GroupBadge name={card.group.name} />

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-base font-bold">{card.group.name}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="truncate">
                      {card.memberCount} people
                      <span className="hidden sm:inline">
                        {' · '}{card.expenseCount} {card.expenseCount === 1 ? 'expense' : 'expenses'}
                      </span>
                    </span>
                    {/* Below md the row is too narrow for a column of its own, so the
                        status rides along with the counts instead of squeezing the name. */}
                    <Chip tone={status.tone} className="md:hidden">{status.label}</Chip>
                  </span>
                </span>

                <Chip tone={status.tone} className="hidden md:inline-flex">{status.label}</Chip>

                <span className="shrink-0 text-right">
                  <Amount
                    cents={Math.abs(card.netCents)}
                    size="sm"
                    tone={card.netCents === 0 ? 'neutral' : card.netCents > 0 ? 'credit' : 'debit'}
                    className="block"
                  />
                  {card.netCents !== 0 && (
                    <span className="mt-0.5 hidden text-[0.6875rem] font-semibold whitespace-nowrap text-muted-foreground sm:block">
                      {card.netCents > 0 ? 'owed to you' : 'you owe'}
                    </span>
                  )}
                </span>

                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
