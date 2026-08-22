'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Home, Receipt, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// Contract: DESTINATIONS / isTopLevel / MobileTabs
// Props: MobileTabs takes nothing — it reads the route itself
// Variants: the tab bar exists only below lg, and only on the four top-level screens
// States:每 tab is current | idle, with hover and visible focus
// Accessibility: <nav aria-label="Main">, the current tab carries aria-current="page" and
//   the label is always visible text, not a tooltip on an icon
// Responsive: hidden from lg up, where the sidebar does the same job

/** The four places you can always get back to. Everything else hangs off one of them. */
export const DESTINATIONS: Array<{ href: string, icon: LucideIcon, label: string }> = [
  { href: '/home', icon: Home, label: 'Dashboard' },
  { href: '/settlds', icon: Receipt, label: 'Settlds' },
  { href: '/activity', icon: Clock, label: 'Activity' },
  { href: '/settings', icon: Settings, label: 'Settings' }
]

export const isTopLevel = (pathname: string) =>
  DESTINATIONS.some(destination => destination.href === pathname)

/**
 * The bottom bar on a phone.
 *
 * It only shows on the four top-level screens. On a task screen — paying, adding an
 * expense — the action button lives at the bottom of the thumb's reach, and a tab bar
 * underneath it would either cover it or fight it for the same spot.
 */
export function MobileTabs () {
  const pathname = usePathname()

  if (!isTopLevel(pathname)) return null

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="flex">
        {DESTINATIONS.map(({ href, icon: Icon, label }) => {
          const current = pathname === href

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[0.625rem] font-bold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  current ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    current && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Icon className="size-4.5" strokeWidth={2} aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
