import { formatMoney } from '@/lib/wdk/money'
import { cn } from '@/lib/utils'

// Contract: Amount
// Props: cents (required), size ('hero'|'lg'|'md'|'sm'), tone ('neutral'|'credit'|'debit'|'auto'), signed?, className?
// Variants: four sizes; the 'auto' tone infers credit/debit from the sign
// States: purely presentational — no hover, focus or disabled
// Accessibility: the sign is also communicated in words by the surrounding context,
//   never by colour alone (WCAG 1.4.1). Numbers use tabular-nums so they don't jump.
// Responsive: 'hero' drops from 4.5rem to 3.75rem below sm so it doesn't overflow
const SIZES = {
  hero: 'text-[3.75rem] sm:text-[4.5rem]',
  lg: 'text-4xl',
  md: 'text-2xl',
  sm: 'text-base'
} as const

const TONES = {
  neutral: 'text-foreground',
  credit: 'text-credit',
  debit: 'text-debit'
} as const

export function Amount ({
  cents,
  size = 'md',
  tone = 'neutral',
  signed = false,
  className
}: {
  cents: number
  size?: keyof typeof SIZES
  tone?: keyof typeof TONES | 'auto'
  signed?: boolean
  className?: string
}) {
  const resolvedTone = tone === 'auto' ? (cents >= 0 ? 'credit' : 'debit') : tone

  return (
    <span className={cn('amount', SIZES[size], TONES[resolvedTone], className)}>
      {formatMoney(cents, { sign: signed })}
    </span>
  )
}
