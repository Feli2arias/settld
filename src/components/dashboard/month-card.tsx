import { CheckCircle2, Receipt, TrendingUp } from 'lucide-react'
import { Panel, PanelHead } from '@/components/dashboard/panel'
import { formatMoney } from '@/lib/wdk/money'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { MonthStats } from '@/lib/split/dashboard'

// Contract: MonthCard
// Props: month (required)
// Variants: none
// States: purely presentational
// Accessibility: each figure is read together with its label because they sit in the same
//   block; the icons are decorative
// Responsive: three across from sm up, stacked below

function Stat ({ icon: Icon, value, label, disc }: { icon: LucideIcon, value: string, label: string, disc: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', disc)}>
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="amount text-lg">{value}</p>
        <p className="text-xs leading-tight font-semibold text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function MonthCard ({ month }: { month: MonthStats }) {
  return (
    <Panel>
      <PanelHead title="This month" />

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:[&>*]:px-3.5 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0">
        <Stat
          icon={Receipt}
          value={String(month.settlds)}
          label={month.settlds === 1 ? 'settld' : 'settlds'}
          disc="bg-secondary text-foreground"
        />
        <Stat
          icon={TrendingUp}
          value={formatMoney(month.movedCents)}
          label="moved"
          disc="bg-secondary text-foreground"
        />
        <Stat
          icon={CheckCircle2}
          value={String(month.settled)}
          label="settled instantly"
          disc="bg-credit-surface text-credit"
        />
      </div>
    </Panel>
  )
}
