'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Panel } from '@/components/dashboard/panel'
import { SettldList } from '@/components/dashboard/settld-list'
import { Button } from '@/components/ui/button'
import { useLedger } from '@/lib/client/use-ledger'
import { useRequireSession } from '@/lib/client/use-session'

/** Everything you have split, newest first. */
export default function SettldsPage () {
  const session = useRequireSession()
  const { ledger } = useLedger(session?.userId)

  if (!session) return null

  const settlds = ledger ? [...ledger.settlds].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : null

  return (
    <AppShell
      title="Settlds"
      width="wide"
      className="max-w-2xl gap-4"
      action={
        <Button size="pill" asChild className="ml-auto">
          <Link href="/settlds/new">
            <Plus aria-hidden />
            <span className="hidden sm:inline">New settld</span>
            <span className="sr-only sm:hidden">New settld</span>
          </Link>
        </Button>
      }
    >
      {settlds === null
        ? <Panel><p className="py-8 text-center text-sm text-muted-foreground">Loading…</p></Panel>
        : (
            <SettldList
              settlds={settlds}
              people={ledger?.people ?? []}
              userId={session.userId}
            />
          )}
    </AppShell>
  )
}
