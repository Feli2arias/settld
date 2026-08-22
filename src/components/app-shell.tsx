import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// Contract: AppShell
// Props: children (required), title?, backHref?, action? (ReactNode), width ('narrow'|'wide'), className?
// Variants:
//   - width="narrow" (default): focused tasks — onboarding, adding an expense, paying.
//     On desktop it centres as a card instead of stretching.
//   - width="wide": content screens — the group. On desktop they use the width available.
//   - width="full": the dashboard, the only screen laid out in two columns of cards.
// States: structural; the interactive states belong to the back link
// Accessibility: <main> as a landmark. The title is an <h1> on desktop and a micro-label
//   in the mobile bar. The back button is a link with an aria-label.
// Responsive:
//   - <lg: a single 28rem column with a sticky top bar, built for the thumb.
//   - ≥lg: no sticky bar, the title becomes a large headline and the back button
//     disappears because navigation lives in the sidebar.
export function AppShell ({
  children,
  title,
  backHref,
  action,
  width = 'narrow',
  className
}: {
  children: React.ReactNode
  title?: string
  backHref?: string
  action?: React.ReactNode
  width?: 'narrow' | 'wide' | 'full'
  className?: string
}) {
  const hasBar = Boolean(title || backHref || action)

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-md flex-1 flex-col',
        width === 'narrow' && 'lg:max-w-xl lg:justify-center lg:py-16',
        width === 'wide' && 'md:max-w-2xl lg:mx-0 lg:max-w-5xl lg:px-10 lg:py-12',
        width === 'full' && 'md:max-w-3xl lg:mx-0 lg:max-w-6xl lg:px-10 lg:py-10'
      )}
    >
      {hasBar && (
        <header
          className={cn(
            'sticky top-0 z-20 flex items-center gap-3 bg-background/85 px-5 py-4 backdrop-blur-md',
            'lg:static lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-2 lg:backdrop-blur-none'
          )}
        >
          {backHref && (
            <Link
              href={backHref}
              aria-label="Back"
              className="-ml-2 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none lg:hidden"
            >
              <ChevronLeft className="size-5" />
            </Link>
          )}

          {title && (
            <h1 className="eyebrow flex-1 truncate !text-foreground lg:font-heading lg:!text-4xl lg:font-extrabold lg:tracking-[-0.035em] lg:normal-case">
              {title}
            </h1>
          )}

          {action}
        </header>
      )}

      <main
        className={cn(
          'flex flex-1 flex-col px-5 pb-10 lg:flex-none lg:px-0 lg:pb-0',
          hasBar ? 'pt-1 lg:pt-6' : 'pt-8 lg:pt-0',
          width === 'narrow' && 'lg:min-h-0',
          className
        )}
      >
        {children}
      </main>
    </div>
  )
}
