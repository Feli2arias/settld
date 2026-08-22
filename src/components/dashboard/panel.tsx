import { cn } from '@/lib/utils'

// Contract: Panel / PanelHead / Chip
// Props: Panel(children, className?) · PanelHead(title, action?) · Chip(children, tone, className?)
// Variants: Chip has three tones — credit (green), debit (red) and muted (grey)
// States: purely presentational. Interaction belongs to whatever is placed inside.
// Accessibility: Panel is a plain box; the section it belongs to carries the landmark and
//   the heading. Chip text always says what the colour says (WCAG 1.4.1).
// Responsive: padding tightens below lg so the cards don't eat a phone screen

/** The white card every block of the dashboard sits on. */
export function Panel ({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn('rounded-3xl bg-card p-5 ring-1 ring-border lg:p-6', className)}>
      {children}
    </div>
  )
}

export function PanelHead ({ title, id, action }: { title: string, id?: string, action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id={id} className="font-heading text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
      {action}
    </div>
  )
}

const TONES = {
  credit: 'bg-credit-surface text-credit',
  debit: 'bg-debit-surface text-debit',
  muted: 'bg-secondary text-muted-foreground'
} as const

/** A small status pill. Short words only — it has to survive a narrow column. */
export function Chip ({
  children,
  tone = 'muted',
  className
}: {
  children: React.ReactNode
  tone?: keyof typeof TONES
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold whitespace-nowrap',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
