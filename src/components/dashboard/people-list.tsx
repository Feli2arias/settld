import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Amount } from '@/components/amount'
import { Panel, PanelHead } from '@/components/dashboard/panel'
import { PersonAvatar } from '@/components/person'
import type { PersonDebt } from '@/lib/split/dashboard'

// Contract: PeopleList
// Props: title, debts, direction ('owed'|'owing'), emptyLine
// Variants: 'owing' rows link to the settle screen, 'owed' rows to the person's history
// States: each row has hover and visible focus; an empty list shows a single quiet line
// Accessibility: a <ul> of links under a heading the section is labelled by. The direction
//   is written in the heading, so the colour is never the only thing saying it.
// Responsive: unchanged — one row per line at every width

/** The people on one side of your balance. One row each, netted. */
export function PeopleList ({
  title,
  id,
  debts,
  direction,
  emptyLine
}: {
  title: string
  id?: string
  debts: PersonDebt[]
  direction: 'owed' | 'owing'
  emptyLine: string
}) {
  return (
    <Panel>
      <PanelHead title={title} id={id} />

      {debts.length === 0
        ? <p className="py-5 text-center text-sm text-muted-foreground">{emptyLine}</p>
        : (
            <ul className="-mx-2 divide-y divide-border">
              {debts.map(debt => (
                <li key={debt.userId}>
                  <Link
                    href={direction === 'owing' ? `/settle/${debt.userId}` : `/people/${debt.userId}`}
                    className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <PersonAvatar user={debt.person} size="md" />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading text-base font-bold">
                        {debt.person.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                        @{debt.person.username}
                      </span>
                    </span>

                    <Amount
                      cents={Math.abs(debt.netCents)}
                      size="sm"
                      tone={direction === 'owed' ? 'credit' : 'debit'}
                      className="shrink-0"
                    />

                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
    </Panel>
  )
}
