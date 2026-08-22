import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus } from 'lucide-react'
import { Panel, PanelHead } from '@/components/dashboard/panel'
import { formatWhen } from '@/lib/split/dashboard'
import { cn } from '@/lib/utils'
import type { ActivityItem } from '@/lib/split/dashboard'

// Contract: RecentActivity
// Props: items (required, may be empty)
// Variants: empty state when nothing has happened yet
// States: each row links to its group — hover and visible focus
// Accessibility: the icon disc is decorative; the sentence carries the meaning. A pending
//   payment says "pending" in words next to the colour.
// Responsive: the timestamp moves under the status on mobile; both are hidden from the
//   flow of the sentence so a long description can truncate

const KINDS = {
  expense: { icon: Plus, disc: 'bg-secondary text-muted-foreground' },
  received: { icon: ArrowDownLeft, disc: 'bg-credit-surface text-credit' },
  sent: { icon: ArrowUpRight, disc: 'bg-debit-surface text-debit' },
  other: { icon: ArrowLeftRight, disc: 'bg-secondary text-muted-foreground' }
} as const

const STATUS = {
  confirmed: 'text-credit',
  pending: 'text-muted-foreground',
  failed: 'text-debit'
} as const

export function RecentActivity ({ items }: { items: ActivityItem[] }) {
  return (
    <Panel>
      <PanelHead title="Recent activity" id="activity-label" />

      {items.length === 0
        ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing has happened yet.
            </p>
          )
        : (
            <ul className="-mx-2 divide-y divide-border">
              {items.map(item => {
                const { icon: Icon, disc } = KINDS[item.kind]

                return (
                  <li key={item.id}>
                    <Link
                      href={`/groups/${item.groupId}`}
                      className="flex items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', disc)}>
                        <Icon className="size-4" strokeWidth={2.5} />
                      </span>

                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</span>

                      <span className="shrink-0 text-right">
                        {item.status && (
                          <span className={cn('block text-xs font-bold', STATUS[item.status])}>
                            {item.status}
                          </span>
                        )}
                        <span className="block text-[0.6875rem] font-semibold text-muted-foreground">
                          {formatWhen(item.at)}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
    </Panel>
  )
}
