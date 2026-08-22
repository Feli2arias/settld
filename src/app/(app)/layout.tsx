'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, CreditCard, Plus } from 'lucide-react'
import { AddMoneyDialog } from '@/components/add-money-dialog'
import { DESTINATIONS, MobileTabs, isTopLevel } from '@/components/nav'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { useGroups } from '@/lib/client/use-groups'
import { useSession } from '@/lib/client/use-session'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// Contract: AppLayout
// Props: children (required)
// Variants: below lg the navigation is a bottom tab bar on the four top-level screens;
//   from lg up it is a fixed side rail with the destinations, the groups and the user.
// States: every row has a current, hover and visible-focus state
// Accessibility: <nav aria-label>, the current destination marked with aria-current="page"
// Responsive: the rail is hidden below lg (1024) and 17rem wide above it. The tab bar is
//   hidden from lg up, and the content reserves room for it below.

/**
 * On a phone, Settld is a single-column app you drive with your thumb, with a bar at the
 * bottom for the four places you can always get back to. On a big screen that same narrow
 * column floating in the middle of nowhere looks poor, so the extra space goes to a
 * permanent rail: where to go, which groups are open, and who you are.
 *
 * Every row leads somewhere real. Nothing is listed just to fill the rail.
 */

const ROW = 'flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
const IDLE = 'text-muted-foreground hover:bg-secondary hover:text-foreground'
const CURRENT = 'bg-accent text-accent-foreground'

export default function AppLayout ({ children }: LayoutProps<'/'>) {
  const { session } = useSession()
  const groups = useGroups(session?.userId)
  const pathname = usePathname()

  return (
    <div className="flex flex-1 lg:gap-6">
      <aside className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col border-r border-border px-5 py-8 lg:flex">
        <Link
          href="/home"
          className="px-2 font-heading text-2xl font-extrabold tracking-[-0.04em] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Settld.
        </Link>

        <nav aria-label="Main" className="mt-8 space-y-1">
          {DESTINATIONS.map(({ href, icon: Icon, label }) => {
            const current = pathname === href

            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? 'page' : undefined}
                className={cn(ROW, current ? CURRENT : IDLE)}
              >
                <Icon className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
                {label}
              </Link>
            )
          })}

          {/* Adding money is a dialog, not a screen: you come back to whatever you were
              doing, and half of it happens in someone else's checkout. */}
          {session && (
            <AddMoneyDialog address={session.walletAddress}>
              <NavButton icon={CreditCard} label="Add money" />
            </AddMoneyDialog>
          )}
        </nav>

        <nav aria-label="Your groups" className="mt-8 flex-1 overflow-y-auto">
          <p className="eyebrow mb-3 px-3.5">Groups</p>

          <ul className="space-y-1">
            {groups?.map(group => {
              const href = `/groups/${group.id}`
              const current = pathname.startsWith(href)

              return (
                <li key={group.id}>
                  <Link
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={cn(ROW, 'truncate', current ? CURRENT : IDLE)}
                  >
                    {group.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          {groups?.length === 0 && (
            <p className="px-3.5 text-sm text-muted-foreground">None yet.</p>
          )}

          <Button size="pill" variant="secondary" className="mt-4 w-full" asChild>
            <Link href="/groups/new">
              <Plus aria-hidden />
              New group
            </Link>
          </Button>
        </nav>

        {session && (
          <div className="mt-6 border-t border-border pt-6">
            <Link
              href="/settings"
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <PersonAvatar user={session} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{session.name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{session.username}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">Open your settings</span>
            </Link>
          </div>
        )}
      </aside>

      <div className={cn('flex min-w-0 flex-1 flex-col', isTopLevel(pathname) && 'pb-24 lg:pb-0')}>
        {children}
      </div>

      <MobileTabs />
    </div>
  )
}

/** The same rail row, for the destination that is a dialog rather than a screen. */
function NavButton ({ icon: Icon, label }: { icon: LucideIcon, label: string }) {
  return (
    <button type="button" className={cn(ROW, IDLE)}>
      <Icon className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
      {label}
    </button>
  )
}
