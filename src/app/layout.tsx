import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Manrope } from 'next/font/google'
import './globals.css'

/**
 * Bricolage Grotesque para los montos y titulares: tiene la densidad y el carácter
 * de un tipo de imprenta, que es exactamente el tono de "recibo" que buscamos.
 * Manrope para el resto de la interfaz, en peso 500 como default.
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
  title: 'Split — Split expenses. Settle instantly.',
  description: 'Dividí gastos con tus amigos y saldá las deudas de verdad, en USD₮.'
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf6ee' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a15' }
  ]
}

/**
 * Aplica el tema del sistema antes del primer pintado.
 * Sin esto, quien tiene el celular en modo oscuro ve un flash de papel blanco.
 */
const THEME_SCRIPT = `try{
  var dark = matchMedia('(prefers-color-scheme: dark)');
  var apply = function(){ document.documentElement.classList.toggle('dark', dark.matches) };
  apply();
  dark.addEventListener('change', apply);
}catch(e){}`

export default function RootLayout ({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="paper flex min-h-full flex-col">{children}</body>
    </html>
  )
}
