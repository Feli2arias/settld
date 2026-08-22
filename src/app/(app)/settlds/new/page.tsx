'use client'

import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { SettldForm } from '@/components/settld-form'
import { api } from '@/lib/client/api'
import { useLedger } from '@/lib/client/use-ledger'
import { useRequireSession } from '@/lib/client/use-session'
import { sessionUser } from '@/lib/client/vault'

/** Recording something you paid for, and who owes you a share of it. */
export default function NewSettldPage () {
  const session = useRequireSession()
  const { ledger } = useLedger(session?.userId)
  const router = useRouter()

  if (!session) return null

  return (
    <AppShell title="New settld" backHref="/settlds" className="gap-7">
      <SettldForm
        session={sessionUser(session)}
        people={ledger?.people ?? []}
        submitLabel="Split it"
        onSubmit={async draft => {
          await api.createSettld({ ...draft, paidBy: session.userId })
          router.replace('/home')
        }}
      />
    </AppShell>
  )
}
