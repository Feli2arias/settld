import type { Metadata } from 'next'
import { Landing } from '@/components/landing'

/**
 * The landing page is all that someone who doesn't use Settld yet ever sees, which
 * makes it the page that most needs to render on the server: it's the one people
 * share, the one search engines index, and the one that shows up in link previews.
 *
 * That's why this is a server component that only declares metadata and mounts the
 * landing; the interactivity lives inside.
 */
export const metadata: Metadata = {
  title: 'Settld — Split expenses. Settle instantly.',
  description:
    'Other apps tell you who owes you and stop there. Settld calculates and executes the payment in USD₮ directly from your wallet.',
  openGraph: {
    title: 'Settld — Split expenses. Settle instantly.',
    description:
      'Other apps tell you who owes you and stop there. Settld calculates and executes the payment in USD₮ directly from your wallet.',
    type: 'website'
  }
}

export default function LandingPage () {
  return <Landing />
}
