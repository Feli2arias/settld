import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Manrope } from 'next/font/google'
import './globals.css'

/**
 * Bricolage Grotesque for amounts and headlines: it has the density and character of
 * letterpress type, which is exactly the "receipt" tone we're after. Manrope for the
 * rest of the interface, at weight 500 by default.
 */
const display = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700', '800']
})

const body = Manrope({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['500', '600', '700']
})

export const metadata: Metadata = {
  title: 'Settld — Split expenses. Settle instantly.',
  description: 'Split expenses with friends and actually settle up, in USD₮.'
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf6ee' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a15' }
  ]
}

/**
 * Applies the system theme before the first paint.
 * Without this, anyone with their phone in dark mode gets a flash of white paper.
 */
const THEME_SCRIPT = `try{
  var dark = matchMedia('(prefers-color-scheme: dark)');
  var apply = function(){ document.documentElement.classList.toggle('dark', dark.matches) };
  apply();
  dark.addEventListener('change', apply);
}catch(e){}`

export default function RootLayout ({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="paper flex min-h-full flex-col">{children}</body>
    </html>
  )
}
