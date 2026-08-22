'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Plus } from 'lucide-react'
import { AccountDialog } from '@/components/account-dialog'
import { PersonAvatar } from '@/components/person'
import { Button } from '@/components/ui/button'
import { useGroups } from '@/lib/client/use-groups'
import { useSession } from '@/lib/client/use-session'
import { cn } from '@/lib/utils'

// Contract: AppLayout (sidebar de escritorio)
// Props: children (required)
// Variants: en mobile no existe — la navegación es la barra superior de cada pantalla.
//   A partir de lg aparece una columna lateral fija con marca, grupos y usuario.
// States: cada link de grupo tiene estado activo, hover y focus visible
// Accessibility: <nav aria-label>, el grupo actual marcado con aria-current="page"
// Responsive: oculta por debajo de lg (1024). Ancho fijo de 17rem, altura completa.

/**
 * Settld en el celular es una app de una sola columna que se maneja con el pulgar.
 * En una pantalla grande esa misma columna angosta en el medio de la nada se ve pobre,
 * así que acá el espacio de más se usa para dejar los grupos siempre a la vista.
 */
export default function AppLayout ({ children }: LayoutProps<'/'>) {
  const { session } = useSession()
  const groups = useGroups(session?.userId)
  const pathname = usePathname()

  return (
    <div className="flex flex-1 lg:gap-8">
      <aside className="sticky top-0 hidden h-screen w-68 shrink-0 flex-col border-r border-border px-6 py-8 lg:flex">
        <Link
          href="/home"
          className="font-heading text-2xl font-extrabold tracking-[-0.04em] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Settld.
        </Link>

        <nav aria-label="Tus grupos" className="mt-10 flex-1 overflow-y-auto">
          <p className="eyebrow mb-3">Grupos</p>

          <ul className="space-y-1">
            {groups?.map(group => {
              const href = `/groups/${group.id}`
              const active = pathname.startsWith(href)

              return (
                <li key={group.id}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block truncate rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                      active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    {group.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          {groups?.length === 0 && (
            <p className="px-4 text-sm text-muted-foreground">Todavía ninguno.</p>
          )}

          <Button size="pill" variant="secondary" className="mt-4 w-full" asChild>
            <Link href="/groups/new">
              <Plus aria-hidden />
              Nuevo grupo
            </Link>
          </Button>
        </nav>

        {session && (
          <div className="mt-6 border-t border-border pt-6">
            <AccountDialog session={session}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <PersonAvatar user={session} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{session.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{session.username}</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">Abrir tu cuenta</span>
              </button>
            </AccountDialog>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
