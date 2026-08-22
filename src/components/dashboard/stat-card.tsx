import { Amount } from '@/components/amount'
import { Panel } from '@/components/dashboard/panel'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// Contract: StatCard
// Props: label, cents (null while loading), caption, icon, tone ('credit'|'debit'|'neutral')
// Variants: three tones, which colour both the amount and the icon disc
// States: loading (cents === null shows a placeholder) | ready
// Accessibility: the label is a real <p> tied to the amount by proximity, and the tone is
//   never the only carrier of meaning — the label already says "owed" or "owe".
// Responsive: one per row on mobile, three across from md up. Between md and xl the three
//   cards are narrow enough that the icon disc would start squeezing the caption, so it is
//   only drawn where there is room for it.

const TONES = {
  credit: { amount: 'credit', disc: 'bg-credit-surface text-credit' },
  debit: { amount: 'debit', disc: 'bg-debit-surface text-debit' },
  neutral: { amount: 'neutral', disc: 'bg-secondary text-foreground' }
} as const

export function StatCard ({
  label,
  cents,
  caption,
  icon: Icon,
  tone = 'neutral'
}: {
  label: string
  cents: number | null
  caption: string
  icon: LucideIcon
  tone?: keyof typeof TONES
}) {
  const { amount, disc } = TONES[tone]

  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted-foreground">{label}</p>

          {cents === null
            ? <span className="amount mt-1.5 block text-4xl text-muted-foreground">···</span>
            : <Amount cents={cents} size="lg" tone={amount} className="mt-1.5 block" />}

          <p className="mt-2 truncate text-xs font-semibold text-muted-foreground">{caption}</p>
        </div>

        <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-full md:hidden xl:flex', disc)}>
          <Icon className="size-5" strokeWidth={2} />
        </span>
      </div>
    </Panel>
  )
}
