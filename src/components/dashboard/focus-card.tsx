import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { Amount } from '@/components/amount'
import { Panel } from '@/components/dashboard/panel'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/wdk/money'
import { cn } from '@/lib/utils'
import type { FocusGroup } from '@/lib/split/dashboard'

// Contract: FocusCard
// Props: focus (required), userId (required)
// Variants: the call to action changes with your balance — settle up when you owe,
//   add an expense when the group is clear
// States: each member row is paid | settled | owes
// Accessibility: a real table, with the column headers as <th scope="col">, so the shares
//   are announced with their meaning instead of as loose numbers
// Responsive: the "Share" column is dropped below sm, where three columns won't fit

const STATUS = {
  paid: { label: 'Paid', className: 'text-credit' },
  settled: { label: 'Settled', className: 'text-credit' },
  owes: { label: 'Owes', className: 'text-debit' }
} as const

export function FocusCard ({ focus, userId }: { focus: FocusGroup, userId: string }) {
  const { group, members, netCents } = focus

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <h2 id="focus-label" className="font-heading text-xl font-extrabold tracking-[-0.02em]">
          {group.name}
        </h2>

        <Link
          href={`/groups/${group.id}`}
          className="flex shrink-0 items-center gap-1 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Open
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <p className="mt-4 text-sm font-semibold text-muted-foreground">Total</p>
      <Amount cents={focus.totalCents} size="lg" className="mt-1 block" />
      <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
        {focus.paidByYouCents > 0
          ? `${formatMoney(focus.paidByYouCents)} paid by you`
          : 'You have not paid for anything here yet'}
      </p>

      {members.length > 0 && (
        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="eyebrow pb-2 text-left">People</th>
              <th scope="col" className="eyebrow hidden pb-2 text-right sm:table-cell">Share</th>
              <th scope="col" className="eyebrow pb-2 text-right">Status</th>
            </tr>
          </thead>

          <tbody>
            {members.map(({ user, shareCents, status }) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="py-2.5">
                  <span className="flex items-center gap-2.5">
                    <PersonAvatar user={user} size="sm" />
                    <span className="min-w-0 truncate font-semibold">
                      {user.name}
                      {user.id === userId && (
                        <span className="font-normal text-muted-foreground"> (you)</span>
                      )}
                    </span>
                  </span>
                </td>

                <td className="hidden py-2.5 text-right font-semibold tabular-nums text-muted-foreground sm:table-cell">
                  {formatMoney(shareCents)}
                </td>

                <td className={cn('py-2.5 text-right text-sm font-bold', STATUS[status].className)}>
                  {STATUS[status].label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Button size="pill-lg" variant={netCents < 0 ? 'default' : 'secondary'} className="mt-5" asChild>
        {netCents < 0
          ? (
              <Link href={`/groups/${group.id}/settle`}>
                Settle up {formatMoney(-netCents)}
              </Link>
            )
          : (
              <Link href={`/groups/${group.id}/expenses/new`}>
                <Plus aria-hidden />
                Add expense
              </Link>
            )}
      </Button>
    </Panel>
  )
}
