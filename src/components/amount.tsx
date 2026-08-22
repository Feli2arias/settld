import { formatMoney } from '@/lib/wdk/money'
import { cn } from '@/lib/utils'

// Contract: Amount
// Props: cents (required), size ('hero'|'lg'|'md'|'sm'), tone ('neutral'|'credit'|'debit'|'auto'), signed?, className?
// Variants: cuatro tamaños; el tono 'auto' deduce crédito/débito del signo
// States: es presentacional puro — sin hover, focus ni disabled
// Accessibility: el signo se comunica también con palabras en el contexto que lo envuelve,
//   nunca sólo con color (WCAG 1.4.1). Los números usan tabular-nums para no saltar.
// Responsive: 'hero' baja de 4.5rem a 3.75rem por debajo de sm para no desbordar
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
